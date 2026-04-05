"use client";

import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, FileText, Loader2, Plus } from "lucide-react";
import axios from "axios";
import Image from "next/image";
import EditableText from "@/components/editable-text";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useInputAddressStore, useOutputAddressStore } from "@/zustand/address";
import { useSingleAddress } from "@/features/apis/use-single-address";

export default function OCRV() {
  const [file, setFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const router = useRouter();

  const { data } = useSession();

  const { setInputAddress } = useInputAddressStore();
  const { setOutputAddress } = useOutputAddressStore();

  const singleAddressQuery = useSingleAddress(data?.user?.email!);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setExtractedText(null);
      setError(null);

      const reader = new FileReader();
      reader.onloadend = () => {
        const imageDataUri = reader.result;
        setImageData(imageDataUri as string);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select an image file.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_PYTHON_SERVER_URL}/ocr`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const data = response.data;
      if (!data) {
        throw new Error("OCR processing failed");
      }

      setExtractedText(data.output);
    } catch (err) {
      console.log(err);
      setError("Failed to process the image. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextSave = (newText: string) => {
    setExtractedText(newText);
  };

  const handleContinue = () => {
    singleAddressQuery.mutate(
      {
        address: extractedText!,
      },
      {
        onSuccess: (data) => {
          if ("corrected_address" in data) {
            setOutputAddress(data.corrected_address);
            setInputAddress(extractedText!);
            router.push("/dashboard/address-verifier/map");
          }
        },
      }
    );
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setExtractedText(null);
      setError(null);

      const reader = new FileReader();
      reader.onloadend = () => {
        const imageDataUri = reader.result;
        setImageData(imageDataUri as string);
      };
      reader.readAsDataURL(e.dataTransfer.files[0]);
    }
  };

  return (
    <Card
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="w-full mx-auto border border-purple-500 shadow-lg"
    >
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6 w-full">
          {imageData && (
            <div className="flex flex-col lg:flex-row items-center gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={isLoading}
                onClick={() => {
                  setFile(null);
                  setExtractedText(null);
                  setError(null);
                  setImageData(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Extract Text
                  </>
                )}
              </Button>
            </div>
          )}

          <div className="space-y-2">
            {imageData ? (
              <Image
                src={imageData}
                alt="Uploaded"
                className="w-full h-64 object-contain border rounded-lg overflow-hidden cursor-pointer"
                width={400}
                height={200}
                onClick={() => inputRef.current?.click()}
              />
            ) : (
              <>
                <div className="w-full h-80 flex flex-col items-center justify-center rounded-lg">
                  <Image
                    src="/tool-box-image.svg"
                    alt="Upload Image"
                    width={100}
                    height={100}
                    className="h-32 w-32 hover:cursor-pointer"
                    onClick={() => inputRef.current?.click()}
                  />
                  <p className="mb-2 text-xl text-gray-950 dark:text-gray-400">
                    Drop, Upload or Paste Image
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Supported formats: JPG, PNG, GIF, JFIF (JPEG), HEIC, PDF
                  </p>
                  <p className="my-3 text-slate-400 text-lg">Or</p>
                  <Button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                  >
                    <Plus className="size-4 mr-2" />
                    Browse here
                  </Button>
                </div>
              </>
            )}
            <input
              ref={inputRef}
              hidden
              type="file"
              onChange={handleFileChange}
              accept="image/*,.pdf"
              multiple={false}
              aria-label="Upload File"
            />

            {file && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                File selected: {file.name}
              </p>
            )}
          </div>
        </form>

        {error && (
          <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-lg dark:bg-red-900 dark:text-red-100">
            {error}
          </div>
        )}

        {extractedText && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Extracted Text:</h3>
            <EditableText text={extractedText} onSave={handleTextSave} />
            <div className="flex items-center justify-end mt-4">
              <Button onClick={handleContinue}>
                Continue
                <ArrowRight className="size-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
