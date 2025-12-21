import React from "react";
import UniversalHeader from "./UniversalHeader";

type HeaderClubProps = {
  title: string;
  subtitle?: string;
  showBack?: boolean;
};

const HeaderClub: React.FC<HeaderClubProps> = ({
  title,
  subtitle,
  showBack = true,
}) => {
  return (
    <UniversalHeader
      title={title}
      subtitle={subtitle}
      showBackButton={showBack}
      showLogo={true}
      variant="compact"
    />
  );
};

export default HeaderClub;
