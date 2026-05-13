import { Redirect } from 'expo-router';

// Root always lands on splash; the layout handles session → app redirect
export default function Index() {
  return <Redirect href="/splash" />;
}
