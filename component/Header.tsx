import React from "react";
import UniversalHeader from "./UniversalHeader";

type HeaderProps = {
  location?: string;
  time?: string;
};

/**
 * Header component - Sử dụng cho màn hình booking/stadium
 * Refactored để sử dụng UniversalHeader (DRY principle)
 */
const Header: React.FC<HeaderProps> = ({ location, time }) => {
  return (
    <UniversalHeader
      title={location}
      subtitle={time}
      showLogo={true}
      variant="default"
    />
  );
};

export default Header;
