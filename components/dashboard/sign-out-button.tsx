export function SignOutButton({ action }: { action: () => Promise<void> }) {
  return (
    <form action={action}>
      <button
        type="submit"
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-500 hover:text-slate-900"
      >
        Гарах
      </button>
    </form>
  );
}

