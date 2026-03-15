"""Simple concurrent load test for Flask API endpoints.

Usage examples:
  python scripts/api_stress_test.py --base-url https://your-api.up.railway.app
  python scripts/api_stress_test.py --base-url http://localhost:5000 --users 50 --requests-per-user 20

Default endpoints are public routes so no auth token is required.
"""

from __future__ import annotations

import argparse
import json
import statistics
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass


DEFAULT_ENDPOINTS = ["/api/health", "/api/events/public", "/api/highlights"]


@dataclass
class RequestResult:
    ok: bool
    status_code: int
    elapsed_ms: float
    endpoint: str
    error: str | None = None


def make_request(base_url: str, endpoint: str, timeout_s: float) -> RequestResult:
    url = f"{base_url.rstrip('/')}{endpoint}"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "ltsu-api-stress-test/1.0", "Accept": "application/json"},
        method="GET",
    )

    started = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=timeout_s) as resp:
            _ = resp.read()
            elapsed_ms = (time.perf_counter() - started) * 1000
            ok = 200 <= resp.status < 400
            return RequestResult(ok=ok, status_code=resp.status, elapsed_ms=elapsed_ms, endpoint=endpoint)
    except urllib.error.HTTPError as exc:
        elapsed_ms = (time.perf_counter() - started) * 1000
        return RequestResult(
            ok=False,
            status_code=int(exc.code),
            elapsed_ms=elapsed_ms,
            endpoint=endpoint,
            error=f"HTTPError: {exc}",
        )
    except Exception as exc:  # broad by design for load-test reporting
        elapsed_ms = (time.perf_counter() - started) * 1000
        return RequestResult(
            ok=False,
            status_code=0,
            elapsed_ms=elapsed_ms,
            endpoint=endpoint,
            error=f"{type(exc).__name__}: {exc}",
        )


def percentile(values: list[float], p: float) -> float:
    if not values:
        return 0.0
    rank = max(0, min(len(values) - 1, int(round((p / 100.0) * (len(values) - 1)))))
    return sorted(values)[rank]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Concurrent API stress tester")
    parser.add_argument("--base-url", required=True, help="API base URL, e.g. https://your-api.up.railway.app")
    parser.add_argument("--users", type=int, default=20, help="Concurrent virtual users")
    parser.add_argument("--requests-per-user", type=int, default=10, help="Requests each user sends")
    parser.add_argument("--timeout", type=float, default=15.0, help="Per-request timeout in seconds")
    parser.add_argument(
        "--endpoints",
        type=str,
        default=",".join(DEFAULT_ENDPOINTS),
        help="Comma-separated endpoint paths, e.g. /api/health,/api/events/public",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    endpoints = [e.strip() for e in args.endpoints.split(",") if e.strip()]
    total_requests = args.users * args.requests_per_user * len(endpoints)

    print("Starting stress test...")
    print(
        json.dumps(
            {
                "base_url": args.base_url,
                "users": args.users,
                "requests_per_user": args.requests_per_user,
                "endpoints": endpoints,
                "total_requests": total_requests,
            },
            indent=2,
        )
    )

    all_results: list[RequestResult] = []
    started = time.perf_counter()

    with ThreadPoolExecutor(max_workers=args.users) as pool:
        futures = []
        for _ in range(args.users):
            for _ in range(args.requests_per_user):
                for endpoint in endpoints:
                    futures.append(pool.submit(make_request, args.base_url, endpoint, args.timeout))

        for future in as_completed(futures):
            all_results.append(future.result())

    total_elapsed_s = time.perf_counter() - started
    ok_results = [r for r in all_results if r.ok]
    failed_results = [r for r in all_results if not r.ok]
    latencies = [r.elapsed_ms for r in ok_results]

    throughput = (len(all_results) / total_elapsed_s) if total_elapsed_s > 0 else 0.0
    success_rate = (len(ok_results) / len(all_results) * 100.0) if all_results else 0.0

    print("\n=== Summary ===")
    print(f"Total requests: {len(all_results)}")
    print(f"Successful: {len(ok_results)}")
    print(f"Failed: {len(failed_results)}")
    print(f"Success rate: {success_rate:.2f}%")
    print(f"Wall time: {total_elapsed_s:.2f}s")
    print(f"Throughput: {throughput:.2f} req/s")

    if latencies:
        print("\n=== Latency (successful requests) ===")
        print(f"Avg: {statistics.mean(latencies):.2f} ms")
        print(f"Median: {statistics.median(latencies):.2f} ms")
        print(f"P90: {percentile(latencies, 90):.2f} ms")
        print(f"P95: {percentile(latencies, 95):.2f} ms")
        print(f"P99: {percentile(latencies, 99):.2f} ms")
        print(f"Max: {max(latencies):.2f} ms")

    if failed_results:
        print("\n=== Sample Failures (up to 10) ===")
        for failed in failed_results[:10]:
            print(
                json.dumps(
                    {
                        "endpoint": failed.endpoint,
                        "status_code": failed.status_code,
                        "elapsed_ms": round(failed.elapsed_ms, 2),
                        "error": failed.error,
                    }
                )
            )

    # Exit non-zero when failure rate is high enough to indicate real instability.
    return 0 if success_rate >= 95.0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
