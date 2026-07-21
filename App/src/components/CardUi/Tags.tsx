interface TagsProps {
  tagType: string;
}

const Tags = (props: TagsProps) => {
  const tagColors: Record<string, string> = {
    "Productivity": "dark:bg-green-500/15 dark:text-green-400 dark:border-green-500/20 bg-green-100 text-green-700 border-green-200",
    "Tech & Tools": "dark:bg-sky-500/15 dark:text-sky-400 dark:border-sky-500/20 bg-sky-100 text-sky-700 border-sky-200",
    "Mindset": "dark:bg-violet-500/15 dark:text-violet-400 dark:border-violet-500/20 bg-violet-100 text-violet-700 border-violet-200",
    "Learning & Skills": "dark:bg-orange-500/15 dark:text-orange-400 dark:border-orange-500/20 bg-orange-100 text-orange-700 border-orange-200",
    "Workflows": "dark:bg-indigo-500/15 dark:text-indigo-400 dark:border-indigo-500/20 bg-indigo-100 text-indigo-700 border-indigo-200",
    "Inspiration": "dark:bg-pink-500/15 dark:text-pink-400 dark:border-pink-500/20 bg-pink-100 text-pink-700 border-pink-200",
    "Business": "dark:bg-yellow-500/15 dark:text-yellow-400 dark:border-yellow-500/20 bg-yellow-100 text-yellow-700 border-yellow-200",
    "Health": "dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/20 bg-red-100 text-red-700 border-red-200",
    "Finance": "dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/20 bg-emerald-100 text-emerald-700 border-emerald-200",
  };

  const colorClass = tagColors[props.tagType] || "dark:bg-violet-500/20 dark:text-violet-300 dark:border-violet-500/30 bg-gray-100 text-gray-600 border-gray-200";

  return (
    <div className={`px-2 py-0.5 text-xs font-medium rounded-full border ${colorClass} whitespace-nowrap`}>
      #{props.tagType}
    </div>
  );
};

export default Tags;
