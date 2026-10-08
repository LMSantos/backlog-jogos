// Attribution required by the RAWG API terms of use, on every page
// that shows RAWG data.
export function RawgCredit() {
  return (
    <footer className="mt-auto pt-6 text-center text-xs text-zinc-500">
      Dados por{" "}
      <a
        href="https://rawg.io"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2"
      >
        RAWG
      </a>
    </footer>
  );
}
