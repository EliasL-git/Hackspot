import Link from "next/link";

export const renderContent = (content: string, author?: any) => {
  if (!content) return null;
  return content.split(/(\s+)/).map((part, i) => {
    // Hashtags
    if (part.startsWith("#")) {
      const tag = part.slice(1);
      return (
        <Link
          key={i}
          href={`/hashtags#${tag}`}
          className="text-primary hover:underline font-bold decoration-2 underline-offset-4"
          onClick={(e) => e.stopPropagation && e.stopPropagation()}
        >
          {part}
        </Link>
      );
    }
    
    // Mentions
    if (part.startsWith("@") && part.length > 1) {
      const handle = part.slice(1).replace(/[^\w\d]/g, ""); // Clean the handle
      return (
        <Link
          key={i}
          href={`/u/${handle}`}
          className="text-secondary font-bold hover:underline cursor-pointer"
          onClick={(e) => e.stopPropagation && e.stopPropagation()}
        >
          {part}
        </Link>
      );
    }

    // $lines command
    if (part === "$lines") {
      if (author?.slackId === 'orpheus') {
        return (
          <span key={i} className="text-primary-dim font-mono font-bold">
            {part}
          </span>
        );
      }
      const count = author?.githubStats?.totalLines || 0;
      return (
        <span key={i} className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-md font-mono font-bold text-sm">
          <span className="material-symbols-outlined text-[16px]">code</span>
          {count.toLocaleString()} lines
        </span>
      );
    }

    // $repo command
    if (part.startsWith("$repo")) {
      return (
        <span key={i} className="text-primary-dim font-mono font-bold">
          {part}
        </span>
      );
    }

    // $help command
    if (part === "$help") {
      return (
        <div key={i} className="my-2 p-3 bg-card-light rounded-lg border-2 border-primary/20 text-sm">
          <h4 className="font-bold flex items-center gap-2 mb-2 text-primary">
            <span className="material-symbols-outlined text-[18px]">help</span>
            Hackspot Commands
          </h4>
          <ul className="space-y-1 text-muted-foreground font-mono">
            <li><span className="text-primary font-bold">$lines</span> — Show your GitHub code count</li>
            <li><span className="text-primary font-bold">$repo [url]</span> — Link a GitHub repository</li>
            <li><span className="text-primary font-bold">$github</span> — Show your GitHub username and stats</li>
            <li><span className="text-primary font-bold">#hashtag</span> — Tag your posts to trend</li>
            <li><span className="text-primary font-bold">@handle</span> — Mention other Hack Clubbers</li>
          </ul>
          <div className="mt-3 text-xs text-muted-foreground">
            <b>$github</b> will show your GitHub username and a summary of your public stats, including your total lines of code, as synced by Hackspot. If you haven't connected your GitHub, it will prompt you to do so.
          </div>
        </div>
      );
    }

    return part;
  });
};