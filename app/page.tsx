import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function MapUI() {
  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Map container taking full screen */}
      <div className="h-full w-full bg-slate-200">
        {/* This would be replaced with an actual map component */}
        <div className="absolute inset-0 flex items-center justify-center text-slate-400">
          <p className="text-xl font-medium">Map View</p>
        </div>
      </div>

      {/* Search bar positioned in the top left corner */}
      <div className="absolute left-4 top-4 z-10 w-full max-w-md">
        <div className="flex items-center gap-2 rounded-lg bg-white p-2 shadow-lg">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Search locations..."
              className="pl-9 pr-4 py-2 h-10 border-none shadow-none focus-visible:ring-0"
            />
          </div>
          <Button variant="default" size="sm" className="shrink-0">
            Search
          </Button>
        </div>
      </div>
    </div>
  )
}

