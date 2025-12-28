const DocumentIcon = ({ width = '100%', height = '100%' }) => {
  console.log("DocumentIcon rendered");

  return (
    <img 
      src="/src/components/icons/notes.png" 
      alt="Notes" 
      style={{ width, height, objectFit: 'contain' }}
    />
  );
};

export default DocumentIcon;
