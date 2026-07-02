import { redirect } from 'next/navigation';

export default function WithdrawRedirect() {
  redirect('/finance?tab=withdraw');
}
