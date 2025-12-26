interface NavFieldProps{
  textt: String,
  startIcon: React.ReactElement
}

const NavFields = (props: NavFieldProps)=>{
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors group">
      <div className="text-gray-600 group-hover:text-blue-600 transition-colors">
        {props.startIcon}
      </div>
      <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
        {props.textt}
      </span>
    </div> 
  )
}

export default NavFields;