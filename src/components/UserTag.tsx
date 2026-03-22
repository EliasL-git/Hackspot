import React from 'react';

export const TAG_METADATA: Record<string, { icon: string, label: string, color: string, desc: string }> = {
  bot: { 
    icon: 'smart_toy', 
    label: 'Bot', 
    color: 'bg-blue-900 text-blue-300 border-blue-400', 
    desc: 'This is an official Hackspot bot account.' 
  },
  owner: { 
    icon: 'workspace_premium', 
    label: 'Owner', 
    color: 'bg-yellow-900 text-yellow-300 border-yellow-400', 
    desc: 'This user is the owner of Hackspot.' 
  },
  hackclubstaff: { 
    icon: 'badge', 
    label: 'Staff', 
    color: 'bg-red-900 text-red-300 border-red-400', 
    desc: 'This user is a member of the Hack Club staff team. They do not have any control over Hackspot.' 
  },
  contributor: { 
    icon: 'terminal', 
    label: 'Contributor', 
    color: 'bg-green-900 text-green-300 border-green-400', 
    desc: 'This user has contributed to the Hackspot codebase.' 
  },
  notable: { 
    icon: 'star', 
    label: 'Notable', 
    color: 'bg-purple-900 text-purple-300 border-purple-400', 
    desc: 'A recognized member of the community.' 
  },
  verified: { 
    icon: 'verified', 
    label: 'Verified', 
    color: 'bg-primary/20 text-primary border-primary/30', 
    desc: 'Identity verified by Hackspot.' 
  }
};

interface UserTagProps {
  tag: string;
  className?: string;
}

export const UserTag: React.FC<UserTagProps> = ({ tag, className = "" }) => {
  const meta = TAG_METADATA[tag] || { 
    icon: 'label', 
    label: tag.charAt(0).toUpperCase() + tag.slice(1), 
    color: 'bg-surface-container-highest text-on-surface-variant/60 border-outline-variant/20', 
    desc: `Tag: ${tag}` 
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ml-1 border transition-all hover:scale-105 cursor-help ${meta.color} ${className}`}
      title={meta.desc}
    >
      <span className="material-symbols-outlined text-[16px] align-middle">{meta.icon}</span>
      {meta.label}
    </span>
  );
};
