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
import { useState } from "react";
import Image from "next/image";
import { Loader2, X } from "lucide-react";
import { signUp } from "@/lib/auth-client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function SignUp() {
  const [Name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <FieldGroup className="z-50 rounded-md rounded-t-none max-w-md">
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="text-muted-foreground text-sm text-balance">
          Fill in the form below to create your account
        </p>
      </div>{" "}
      <Field>
        <Label htmlFor="first-name">First name</Label>
        <Input
          id="first-name"
          placeholder="Max"
          required
          onChange={(e) => {
            setName(e.target.value);
          }}
          value={Name}
        />
      </Field>
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
        <FieldLabel htmlFor="password">Password</FieldLabel>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          placeholder="Password"
        />
		</Field>
        <Field>
          <FieldLabel htmlFor="password_confirmation">Confirm Password</FieldLabel>
          <Input
            id="password_confirmation"
            type="password"
            value={passwordConfirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
            autoComplete="new-password"
            placeholder="Confirm Password"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="image">Profile Image (optional)</FieldLabel>
          <div className="flex items-end gap-4">
            {imagePreview && (
              <div className="relative w-16 h-16 rounded-sm overflow-hidden">
                <Image
                  src={imagePreview}
                  alt="Profile preview"
                  layout="fill"
                  objectFit="cover"
                />
              </div>
            )}
            <div className="flex items-center gap-2 w-full">
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full"
              />
              {imagePreview && (
                <X
                  className="cursor-pointer"
                  onClick={() => {
                    setImage(null);
                    setImagePreview(null);
                  }}
                />
              )}
            </div>
          </div>
        </Field>
		<FieldSeparator>Or continue with</FieldSeparator>
		<Field>
        <Button
          type="submit"
          className="w-full"
          disabled={loading}
          onClick={async () => {
            await signUp.email({
              email,
              password,
              name: Name,
              image: image ? await convertImageToBase64(image) : "",
              callbackURL: `/dashboard/dataup`,
              fetchOptions: {
                onResponse: () => {
                  setLoading(false);
                },
                onRequest: () => {
                  setLoading(true);
                },
                onError: (ctx) => {
                  toast.error(ctx.error.message);
                },
                onSuccess: () => {
                  router.push("/dashboard");
                },
              },
            });
          }}
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            "Create your account"
          )}
        </Button>
		</Field>
    </FieldGroup>
  );
}

async function convertImageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
