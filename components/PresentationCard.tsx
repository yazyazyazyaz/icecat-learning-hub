import { ExternalLink } from "lucide-react";
import Link from "next/link";

export default function PresentationCard({
  title, description, path,
}: { title: string; description?: string | null; path: string; }) {
  return (
    <div className="bg-white border border-[hsl(var(--border,214_32%_92%))] rounded-2xl shadow-sm hover:shadow-md transition">
      <div className="p-5">
        <h3 className="font-semibold tracking-tight">{title}</h3>
        {description ? <p className="text-sm text-gray-600 mt-1">{description}</p> : null}
        <div className="mt-4">
          <Link
            href={path}
            target="_blank"
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-full border hover:bg-gray-50"
          >
            Open <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

