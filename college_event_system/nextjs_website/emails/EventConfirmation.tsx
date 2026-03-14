import { Button, Heading, Html, Text } from '@react-email/components';

interface EventConfirmationProps {
  studentName: string;
  eventName: string;
}

export default function EventConfirmation({
  studentName,
  eventName,
}: EventConfirmationProps) {
  return (
    <Html>
      <Heading>Registration Confirmed!</Heading>
      <Text>
        Hi {studentName}, you are registered for {eventName}
      </Text>
      <Button href="https://ltsu.vercel.app">View Event</Button>
    </Html>
  );
}
