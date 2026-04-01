interface NavFieldProps{
  textt: String,
  startIcon: React.ReactElement
}

const NavFields = (props: NavFieldProps)=>{
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl dark:hover:bg-white/8 hover:bg-violet-50 cursor-pointer transition-all duration-200 group">
      <div className="dark:text-white/40 text-gray-400 group-hover:text-violet-500 dark:group-hover:text-violet-400 transition-colors">
        {props.startIcon}
      </div>
      <span className="text-sm font-medium dark:text-white/60 text-gray-600 dark:group-hover:text-white group-hover:text-violet-600 transition-colors">
        {props.textt}
      </span>
    </div>
  )
}

export default NavFields;
