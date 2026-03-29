import React from "react";
import UniversalHeader from "./UniversalHeader";

interface HeaderWithBackProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
}

/**
 * Header with back button (no logo)
 * Use this for detail/sub pages where user needs to go back
 */
const HeaderWithBack: React.FC<HeaderWithBackProps> = ({
  title,
  subtitle,
  onBack,
}) => {
  return (
    <UniversalHeader
      title={title}
      subtitle={subtitle}
      showBackButton={true}
      showLogo={false}
      onBackPress={onBack}
      variant="default"
    />
  );
};

export default HeaderWithBack;
