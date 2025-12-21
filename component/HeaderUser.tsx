import React from "react";
import UniversalHeader from "./UniversalHeader";

type HeaderProps = {
  location?: string;
  time?: string;
};

const HeaderUser: React.FC<HeaderProps> = ({ location, time }) => {
  return (
    <UniversalHeader
      title={location}
      subtitle={time}
      showLogo={true}
      variant="default"
    />
  );
};

export default HeaderUser;
