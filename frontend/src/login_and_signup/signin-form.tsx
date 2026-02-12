"use client";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { Loader2, Key } from "lucide-react";
import { signIn } from "@/lib/auth-client";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  return (
    <FieldGroup className="max-w-md">
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-lg md:text-xl">登录账号</h1>
        <p className="text-xs md:text-sm">请输入您的邮箱以登录您的账号</p>
      </div>

      <Field>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input
          id="email"
          type="email"
          placeholder="m@example.com"
          required
          onChange={(e) => {
            setEmail(e.target.value);
          }}
          value={email}
        />
      </Field>

      <Field>
        <div className="flex items-center">
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Link
            href="#"
            className="ml-auto text-sm underline-offset-4 hover:underline"
          >
            Forgot your password?
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          placeholder="password"
          autoComplete="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>

      <div className="flex items-center gap-2">
        <Checkbox
          id="remember"
          onClick={() => {
            setRememberMe(!rememberMe);
          }}
        />
        <Label htmlFor="remember">Remember me</Label>
      </div>
      <Button
        type="submit"
        className="w-full"
        disabled={loading}
        onClick={async () => {
          await signIn.email({
            email,
            password,
            rememberMe,
            callbackURL: "/dashboard/dataup",
            fetchOptions: {
              onRequest: () => {
                setLoading(true);
              },
              onResponse: () => {
                setLoading(false);
              },
            },
          });
        }}
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <p>Login</p>
        )}
      </Button>
      <FieldSeparator>其他登录方式</FieldSeparator>
      <div
        className={cn(
          "w-full gap-2 flex items-center",
          "justify-between flex-col",
        )}
      >
        <Button
          variant="outline"
          className="w-full gap-2"
          disabled={loading}
          onClick={async () => {
            await signIn.social({
              provider: "github",
              callbackURL: "/dashboard",
              fetchOptions: {
                onRequest: () => {
                  setLoading(true);
                },
                onResponse: () => {
                  setLoading(false);
                },
              },
            });
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="1em"
            height="1em"
            viewBox="0 0 24 24"
          >
            <path
              fill="currentColor"
              d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5c.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34c-.46-1.16-1.11-1.47-1.11-1.47c-.91-.62.07-.6.07-.6c1 .07 1.53 1.03 1.53 1.03c.87 1.52 2.34 1.07 2.91.83c.09-.65.35-1.09.63-1.34c-2.22-.25-4.55-1.11-4.55-4.92c0-1.11.38-2 1.03-2.71c-.1-.25-.45-1.29.1-2.64c0 0 .84-.27 2.75 1.02c.79-.22 1.65-.33 2.5-.33s1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02c.55 1.35.2 2.39.1 2.64c.65.71 1.03 1.6 1.03 2.71c0 3.82-2.34 4.66-4.57 4.91c.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2"
            ></path>
          </svg>
          Sign in with Github
        </Button>
      </div>
    </FieldGroup>
  );
}
