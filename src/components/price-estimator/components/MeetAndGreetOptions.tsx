import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";

interface MeetAndGreetOptionsProps {
  passengers: number;
  setPassengers: (passengers: number) => void;
  additionalHours: number;
  setAdditionalHours: (hours: number) => void;
  wantBuggy: boolean;
  setWantBuggy: (want: boolean) => void;
  wantPorter: boolean;
  setWantPorter: (want: boolean) => void;
  bags: number;
  setBags: (bags: number) => void;
  isHeathrowExcludingT5: boolean;
}

export default function MeetAndGreetOptions({
  passengers,
  setPassengers,
  additionalHours,
  setAdditionalHours,
  wantBuggy,
  setWantBuggy,
  wantPorter,
  setWantPorter,
  bags,
  setBags,
}: MeetAndGreetOptionsProps) {
  return (
    <>
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="w-full sm:w-1/2 space-y-2">
          <Label>Number of Passengers</Label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={() => setPassengers(Math.max(1, passengers - 1))}
              disabled={passengers <= 1}
            >
              -
            </Button>
            <Input
              type="number"
              min="1"
              value={passengers}
              onChange={(e) => setPassengers(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-20 text-center"
            />
            <Button
              type="button"
              onClick={() => setPassengers(passengers + 1)}
            >
              +
            </Button>
          </div>
          {passengers >= 3 && (
            <p className="text-xs text-yellow-600 flex items-center">
              <AlertCircle className="mr-2 h-4 w-4" />
              Additional passengers (over 2) cost £45 + VAT each
            </p>
          )}
        </div>
        <div className="w-full sm:w-1/2 space-y-2">
          <Label>Additional Hours</Label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={() => setAdditionalHours(Math.max(0, additionalHours - 1))}
              disabled={additionalHours <= 0}
            >
              -
            </Button>
            <Input
              type="number"
              min="0"
              value={additionalHours}
              onChange={(e) => setAdditionalHours(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-20 text-center"
            />
            <Button
              type="button"
              onClick={() => setAdditionalHours(additionalHours + 1)}
            >
              +
            </Button>
          </div>
          <p className="text-xs text-yellow-600 flex items-center">
            <AlertCircle className="mr-2 h-4 w-4" />
            Additional hours (over standard 2 hours) applies at £50 + VAT per hour.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="w-full sm:w-1/2 space-y-2">
          <Label>Want Buggy?</Label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={wantBuggy ? "default" : "outline"}
              onClick={() => setWantBuggy(true)}
            >
              Yes
            </Button>
            <Button
              type="button"
              variant={!wantBuggy ? "default" : "outline"}
              onClick={() => setWantBuggy(false)}
            >
              No
            </Button>
          </div>
        </div>
        <div className="w-full sm:w-1/2 space-y-2">
          <Label>Want Porter?</Label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={wantPorter ? "default" : "outline"}
              onClick={() => setWantPorter(true)}
            >
              Yes
            </Button>
            <Button
              type="button"
              variant={!wantPorter ? "default" : "outline"}
              onClick={() => setWantPorter(false)}
            >
              No
            </Button>
          </div>
        </div>
      </div>

      {wantPorter && (
        <div className="space-y-2">
          <Label>Number of Bags</Label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={() => setBags(Math.max(0, bags - 1))}
              disabled={bags <= 0}
            >
              -
            </Button>
            <Input
              type="number"
              min="0"
              value={bags}
              onChange={(e) => setBags(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-20 text-center"
            />
            <Button
              type="button"
              onClick={() => setBags(bags + 1)}
            >
              +
            </Button>
          </div>
          {bags > 8 && (
            <p className="text-xs text-yellow-600 flex items-center">
              <AlertCircle className="mr-2 h-4 w-4" />
              Additional porter fee applies for bags over 8 at £65 + VAT per 8 bags
            </p>
          )}
        </div>
      )}
    </>
  );
}