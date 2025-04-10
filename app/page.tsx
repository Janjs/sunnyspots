"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import MapView from "@/app/components/MapView";
import { useState } from "react";
import { Label } from "@/components/ui/label";

export default function MapUI() {
  const [loadingPercentage, setLoadingPercentage] = useState(0);

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <MapView onLoadingProgress={setLoadingPercentage} />

      {/* Search bar positioned in the top left corner */}
      <div className="absolute left-4 top-4 z-10 w-full max-w-md">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input type="text" placeholder="Search bars and restaurants in Utrecht..." />
          </div>
          <Button variant="default" size="sm">
            Search
          </Button>
        </div>
      </div>

      {/* Loading percentage indicator */}
      <div className="absolute right-4 top-4 z-10">
        {loadingPercentage > 0 && loadingPercentage < 100 && (
          <Label className="rounded-md bg-white/90 px-3 py-1 text-sm font-medium shadow-sm">
            Loading: {loadingPercentage}%
          </Label>
        )}
      </div>
    </div>
  );
}
