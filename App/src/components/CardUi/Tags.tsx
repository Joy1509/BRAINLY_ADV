interface TagsProps{
  tagType: string;
}

const Tags = (props: TagsProps)=>{
  const tagColors: Record<string, string> = {
    "Productivity": "bg-green-100 text-green-700",
    "Tech & Tools": "bg-blue-100 text-blue-700", 
    "Mindset": "bg-purple-100 text-purple-700",
    "Learning & Skills": "bg-orange-100 text-orange-700",
    "Workflows": "bg-indigo-100 text-indigo-700",
    "Inspiration": "bg-pink-100 text-pink-700",
    "Business": "bg-yellow-100 text-yellow-700",
    "Health": "bg-red-100 text-red-700",
    "Finance": "bg-emerald-100 text-emerald-700"
  };

  const colorClass = tagColors[props.tagType] || "bg-gray-100 text-gray-700";

  return (
    <div className={`px-2 py-1 text-xs font-medium rounded-full ${colorClass} whitespace-nowrap`}>
      #{props.tagType}
    </div>
  )
} 

export default Tags;