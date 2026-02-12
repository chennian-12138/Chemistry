'use client';

import { Button } from '@/components/ui/button';
import { createClient } from '@/utils/supabase/client';
import { signInWithOAuth } from '@/utils/auth-helpers/client'; // if you still want your helper available
import { FcGoogle } from 'react-icons/fc';
import { FaLinkedin } from 'react-icons/fa';
import { useState } from 'react';
import { Input } from '../ui/input';

type Provider = 'google' | 'linkedin_oidc';

type OAuthProviders = {
  name: Provider;
  displayName: string;
  icon: JSX.Element;
};

export default function OauthSignIn() {
  const [isSubmitting, setIsSubmitting] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const oAuthProviders: OAuthProviders[] = [
    {
      name: 'google',
      displayName: 'Continue with Google',
      icon: <FcGoogle className="h-5 w-5" />
    },
    {
      name: 'linkedin_oidc',
      displayName: 'Continue with LinkedIn',
      icon: <FaLinkedin className="h-5 w-5 text-[#0077B5]" />
    }
  ];

  const handleOAuthSignIn = async (provider: Provider) => {
    setIsSubmitting(provider);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;
    } catch (err) {
      setError(err.message || 'An error occurred during sign-in');
      setIsSubmitting(null);
    }
  };

  return (
    <div className="mt-8">
      {error && <p className="text-red-500 text-sm mb-2">{error}</p>}

      {oAuthProviders.map((provider) => (
        <form
          key={provider.name}
          className="pb-2"
          onSubmit={(e) => {
            e.preventDefault();
            handleOAuthSignIn(provider.name);
          }}
        >
          <Input type="hidden" name="provider" value={provider.name} />
          <Button
            variant="outline"
            type="submit"
            className="w-full text-foreground py-6 dark:text-white"
            disabled={!!isSubmitting}
          >
            <span className="mr-2">{provider.icon}</span>
            {isSubmitting === provider.name ? (
              <span>Signing in...</span>
            ) : (
              <span>{provider.displayName}</span>
            )}
          </Button>
        </form>
      ))}
    </div>
  );
}
