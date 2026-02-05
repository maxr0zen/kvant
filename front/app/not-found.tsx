import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Страница не найдена</h1>
      <p className="text-muted-foreground text-center">
        Запрашиваемая страница не существует или была перемещена.
      </p>
      <Link href="/tracks">
        <Button>Перейти к трекам</Button>
      </Link>
    </div>
  );
}
