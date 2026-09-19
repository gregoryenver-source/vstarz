import { Facebook, Instagram, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  shareToFacebook,
  shareToInstagram,
  copyLink,
  absoluteUrl,
} from "@/lib/socialShare";

type Props = {
  /** In-app route to share (converted to an absolute, base-aware URL). */
  path: string;
  /** Short headline used in captions/quotes, e.g. an audition title. */
  title: string;
  /** Optional context line, e.g. the contest or artist name. */
  subtitle?: string;
  /** Optional media URL to enable direct Instagram file sharing (mobile). */
  mediaUrl?: string;
  compact?: boolean;
};

export function SocialShareButtons({
  path,
  title,
  subtitle,
  mediaUrl,
  compact = false,
}: Props) {
  const url = absoluteUrl(path);
  const caption = subtitle ? `${title} — ${subtitle}` : title;

  const igCaption = `🔥 ${caption} on VStarz — The World's First Digital Mobile Talent Contest & Creator Economy Platform`;

  const handleCopy = () => {
    copyLink(url).catch(() => toast.error("Could not copy the link"));
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground hover:text-[#1877F2]"
          aria-label="Share on Facebook"
          title="Share on Facebook"
          onClick={() => shareToFacebook(url, igCaption)}
        >
          <Facebook className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground hover:text-[#E4405F]"
          aria-label="Share to Instagram"
          title="Share to Instagram"
          onClick={() =>
            shareToInstagram({
              url,
              text: igCaption,
              fileUrl: mediaUrl,
              fileName: "vstarz.mp4",
            })
          }
        >
          <Instagram className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground hover:text-primary"
          aria-label="Copy link"
          title="Copy link"
          onClick={handleCopy}
        >
          <Link2 className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Share
      </span>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 hover:border-[#1877F2]/50 hover:bg-[#1877F2]/10 hover:text-[#1877F2]"
        aria-label="Share on Facebook"
        onClick={() => shareToFacebook(url, igCaption)}
      >
        <Facebook className="size-4" />
        Facebook
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 hover:border-[#E4405F]/50 hover:bg-[#E4405F]/10 hover:text-[#E4405F]"
        aria-label="Share to Instagram"
        onClick={() =>
          shareToInstagram({
            url,
            text: igCaption,
            fileUrl: mediaUrl,
            fileName: "vstarz.mp4",
          })
        }
      >
        <Instagram className="size-4" />
        Instagram
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        aria-label="Copy link"
        onClick={handleCopy}
      >
        <Link2 className="size-4" />
        Copy link
      </Button>
    </div>
  );
}
