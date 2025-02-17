
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import type { StreamCredentials } from "@/types/auth";
import { saveStreamCredentials } from "@/services/iptvService";

interface StreamSetupDialogProps {
  onCredentialsSubmit: (credentials: StreamCredentials) => void;
}

export const StreamSetupDialog = ({ onCredentialsSubmit }: StreamSetupDialogProps) => {
  const { toast } = useToast();
  const [credentials, setCredentials] = useState<StreamCredentials>({
    type: 'xtream',
    url: '',
    username: '',
    password: '',
  });
  const [open, setOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!credentials.url) {
        toast({
          title: "Error",
          description: "URL is required",
          variant: "destructive",
        });
        return;
      }

      await saveStreamCredentials(credentials);
      onCredentialsSubmit(credentials);
      setOpen(false);
      toast({
        title: "Success",
        description: "Stream credentials updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save credentials",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg" className="text-xl p-6">
          Update Stream Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Stream Settings</DialogTitle>
          <DialogDescription>
            Update your streaming service credentials
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Input
            placeholder="Server URL"
            value={credentials.url}
            onChange={e => setCredentials(prev => ({ ...prev, url: e.target.value }))}
            className="text-lg p-6"
          />
          <Input
            placeholder="Username"
            value={credentials.username}
            onChange={e => setCredentials(prev => ({ ...prev, username: e.target.value }))}
            className="text-lg p-6"
          />
          <Input
            type="password"
            placeholder="Password"
            value={credentials.password}
            onChange={e => setCredentials(prev => ({ ...prev, password: e.target.value }))}
            className="text-lg p-6"
          />
          <DialogFooter>
            <Button type="submit" size="lg" className="text-lg">
              Update Credentials
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
