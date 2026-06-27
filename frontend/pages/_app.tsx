import type { AppProps } from "next/app";

export default function ShinApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
