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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import type { StreamCredentials } from "@/types/auth";

interface StreamSetupDialogProps {
  onCredentialsSubmit: (credentials: StreamCredentials) => void;
}

export const StreamSetupDialog = ({ onCredentialsSubmit }: StreamSetupDialogProps) => {
  const { toast } = useToast();
  const [credentialType, setCredentialType] = useState<'xtream' | 'm3u' | 'mac'>('xtream');
  const [credentials, setCredentials] = useState<StreamCredentials>({
    type: 'xtream',
    url: '',
    username: '',
    password: '',
    macAddress: '',
    serialNumber: '',
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
        description: "Stream credentials saved successfully",
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
          Configure Stream Source
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Stream Setup</DialogTitle>
          <DialogDescription>
            Enter your streaming service credentials
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            value={credentialType}
            onValueChange={(value: 'xtream' | 'm3u' | 'mac') => {
              setCredentialType(value);
              setCredentials(prev => ({ ...prev, type: value }));
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="xtream">Xtream Codes</SelectItem>
              <SelectItem value="m3u">M3U URL</SelectItem>
              <SelectItem value="mac">MAC Address</SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="Server URL"
            value={credentials.url}
            onChange={e => setCredentials(prev => ({ ...prev, url: e.target.value }))}
            className="text-lg p-6"
          />

          {credentialType === 'xtream' && (
            <>
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
            </>
          )}

          {credentialType === 'mac' && (
            <>
              <Input
                placeholder="MAC Address"
                value={credentials.macAddress}
                onChange={e => setCredentials(prev => ({ ...prev, macAddress: e.target.value }))}
                className="text-lg p-6"
              />
              <Input
                placeholder="Serial Number"
                value={credentials.serialNumber}
                onChange={e => setCredentials(prev => ({ ...prev, serialNumber: e.target.value }))}
                className="text-lg p-6"
              />
            </>
          )}

          <DialogFooter>
            <Button type="submit" size="lg" className="text-lg">
              Save Credentials
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
