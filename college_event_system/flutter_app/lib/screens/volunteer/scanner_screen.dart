import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../config/api_config.dart';
import 'package:provider/provider.dart';

class ScannerScreen extends StatefulWidget {
  const ScannerScreen({super.key});

  @override
  State<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends State<ScannerScreen> {
  // Manual token verify path backed by /api/qr/verify.
  final TextEditingController _ticketController = TextEditingController();
  bool _isProcessing = false;
  String _resultMessage = '';
  bool _success = false;

  Future<void> _processCheckIn(String qrCode) async {
    setState(() {
      _isProcessing = true;
      _resultMessage = '';
    });

    try {
      final api = context.read<ApiService>();
      if (qrCode.trim().isEmpty) {
        throw Exception('QR token is required');
      }

      final result = await api.post('${ApiConfig.baseUrl}/qr/verify', {
        'token': qrCode.trim(),
      });
      final message =
          (result['message'] ?? 'Verification completed.').toString();
      final valid = result['valid'] == true;

      setState(() {
        _success = valid;
        _resultMessage =
            valid ? message : (result['error'] ?? message).toString();
      });
    } catch (e) {
      setState(() {
        _success = false;
        _resultMessage = 'Failed to check in: ${e.toString()}';
      });
    } finally {
      setState(() {
        _isProcessing = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('QR Scanner Check-in'),
        backgroundColor: Colors.deepOrange,
        foregroundColor: Colors.white,
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          children: [
            Container(
              height: 300,
              width: double.infinity,
              decoration: BoxDecoration(
                color: Colors.black87,
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.camera_alt, color: Colors.white54, size: 64),
                    SizedBox(height: 16),
                    Text(
                      'Use manual token verification below when camera scanning is unavailable.',
                      style: TextStyle(color: Colors.white),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 32),
            const Text('Or enter ticket ID manually:'),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _ticketController,
                    decoration: const InputDecoration(
                      border: OutlineInputBorder(),
                      hintText: 'Enter ticket ID...',
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: _isProcessing
                      ? null
                      : () => _processCheckIn(_ticketController.text),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.deepOrange,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 24,
                      vertical: 16,
                    ),
                  ),
                  child: _isProcessing
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2,
                          ),
                        )
                      : const Text('Verify'),
                ),
              ],
            ),
            const SizedBox(height: 24),
            if (_resultMessage.isNotEmpty)
              Container(
                padding: const EdgeInsets.all(16),
                width: double.infinity,
                decoration: BoxDecoration(
                  color: _success ? Colors.green.shade50 : Colors.red.shade50,
                  border: Border.all(
                    color: _success ? Colors.green : Colors.red,
                  ),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(
                      _success ? Icons.check_circle : Icons.error,
                      color: _success ? Colors.green : Colors.red,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        _resultMessage,
                        style: TextStyle(
                          color: _success
                              ? Colors.green.shade800
                              : Colors.red.shade800,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _ticketController.dispose();
    super.dispose();
  }
}
