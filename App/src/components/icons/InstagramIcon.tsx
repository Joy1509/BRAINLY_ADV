const InstagramIcon = ({ width = '100%', height = '100%' }) => {
  return (
    <img 
      src="/src/components/icons/instagram.png" 
      alt="Instagram" 
      style={{ width, height, objectFit: 'contain' }}
    />
  );
};

export default InstagramIcon;
