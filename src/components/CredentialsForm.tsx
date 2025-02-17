
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { authenticateXtream } from '@/services/iptvService';
import { Eye, EyeOff } from 'lucide-react';

interface CredentialsFormProps {
  onSuccess: () => void;
}

export const CredentialsForm = ({ onSuccess }: CredentialsFormProps) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [url, setUrl] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await authenticateXtream({ username, password, url });
      toast({
        title: 'Success',
        description: 'Successfully connected to IPTV provider',
      });
      onSuccess();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to connect to IPTV provider',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-md mx-auto">
      <div>
        <Input
          type="url"
          placeholder="Xtream URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          className="text-lg p-6"
        />
      </div>
      <div>
        <Input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="text-lg p-6"
        />
      </div>
      <div className="relative">
        <Input
          type={showPassword ? 'text' : 'password'}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="text-lg p-6"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-2 top-1/2 -translate-y-1/2"
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
      <Button
        type="submit"
        className="w-full text-lg p-6"
        disabled={isLoading}
      >
        {isLoading ? 'Connecting...' : 'Connect to IPTV'}
      </Button>
    </form>
  );
};
