import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import MapView from "@/app/components/MapView";

export default function MapUI() {
  return (
    <div className="relative h-screen w-full overflow-hidden">
      <MapView />

      {/* Search bar positioned in the top left corner */}
      <div className="absolute left-4 top-4 z-10 w-full max-w-md">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input type="text" placeholder="Search locations..." />
          </div>
          <Button variant="default" size="sm">
            Search
          </Button>
        </div>
      </div>
    </div>
  );
}
