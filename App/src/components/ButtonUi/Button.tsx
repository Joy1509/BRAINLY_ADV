import React from "react";

interface ButtonProps{
  variant: "primary" | "secondary",
  size: "sm" | "lg",
  children: string,
  startIcon?: React.ReactElement,
  endIcon?: React.ReactElement,
  onClick?: ()=> void
} 

const variantStyle = {
  "primary": "bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-lg hover:shadow-xl",
  "secondary": "bg-white text-blue-600 border-2 border-blue-200 hover:bg-blue-50 hover:border-blue-300 shadow-md hover:shadow-lg"
}

const variantSize ={
  "sm": "px-3 py-2 text-sm",
  "lg": "px-4 py-2 text-sm sm:px-6 sm:py-3 sm:text-base"
}

const defaultStyle = "flex gap-2 rounded-lg items-center justify-center font-semibold transition-all duration-200 whitespace-nowrap"

const ButtonUi = (props: ButtonProps) => {
  return <button  onClick={props.onClick}
  className={`${variantStyle[props.variant]} ${variantSize[props.size]} ${defaultStyle}`}>
    {props.startIcon ? props.startIcon : null} 
    <span className="truncate">{props.children}</span>
    {props.endIcon ? props.endIcon: null}
  </button>
};

export default ButtonUi;