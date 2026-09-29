import { LockKeyhole } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";


export function AccessDenied() {
  return (
    <Card className="mx-auto mt-10 max-w-xl">
      <CardContent className="flex items-start gap-4">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl border border-red-400/20 bg-red-500/12 text-red-200">
          <LockKeyhole className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Access restricted</h1>
          <p className="mt-2 text-sm leading-6 text-white/68">
            Your current organization role does not allow this workspace action.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
