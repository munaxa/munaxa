import Link from 'next/link';
import { buttonVariants } from '@munaxa/ui';
import { Page } from '@/components/site-shell';

export default function NotFound() {
  return (
    <Page title="Page not found" lead="That page doesn't exist, or it has moved.">
      <Link href="/" className={buttonVariants()}>
        Back to home
      </Link>
    </Page>
  );
}
