
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { getEPGSettings, saveEPGSettings } from '@/services/iptvService';

export const EPGSettingsDialog = () => {
  const [open, setOpen] = useState(false);
  const [refreshDays, setRefreshDays] = useState(7);
  const { toast } = useToast();

  useEffect(() => {
    getEPGSettings().then(settings => {
      setRefreshDays(settings.refresh_days);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveEPGSettings(refreshDays);
      setOpen(false);
      toast({
        title: 'Success',
        description: 'EPG settings saved successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save EPG settings',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          EPG Settings
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>EPG Settings</DialogTitle>
          <DialogDescription>
            Configure how often to refresh EPG data
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="refreshDays" className="text-sm font-medium">
                Refresh Interval (days)
              </label>
              <Input
                id="refreshDays"
                type="number"
                min="1"
                max="14"
                value={refreshDays}
                onChange={(e) => setRefreshDays(parseInt(e.target.value))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Save changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
