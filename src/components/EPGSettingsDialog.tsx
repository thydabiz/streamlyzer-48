
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
import { Settings, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { getEPGSettings, saveEPGSettings } from '@/services/iptvService';
import { refreshEPGData } from '@/services/epgService';

export const EPGSettingsDialog = ({ onRefreshComplete }: { onRefreshComplete?: () => void }) => {
  const [open, setOpen] = useState(false);
  const [refreshDays, setRefreshDays] = useState(7);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
      toast.success('EPG settings saved successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save EPG settings');
    }
  };

  const handleRefreshEPG = async () => {
    setIsRefreshing(true);
    try {
      await refreshEPGData();
      if (onRefreshComplete) {
        onRefreshComplete();
      }
    } catch (error) {
      // Error handling is done in refreshEPGData
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>EPG Settings</DialogTitle>
          <DialogDescription>
            Configure EPG refresh settings and manage EPG data
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <form onSubmit={handleSubmit} className="space-y-4">
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
            <Button type="submit" className="w-full">Save settings</Button>
          </form>
          
          <div className="border-t pt-4">
            <Button 
              type="button" 
              variant="outline" 
              className="w-full"
              onClick={handleRefreshEPG}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing EPG...' : 'Refresh EPG Now'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
