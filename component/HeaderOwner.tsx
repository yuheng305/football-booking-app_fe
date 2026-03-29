import React from "react";
import { router } from "expo-router";
import UniversalHeader from "./UniversalHeader";

type HeaderOwnerProps = {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
};

/**
 * Header for Owner screens
 * @param title - Main title (e.g., page name)
 * @param subtitle - Subtitle (e.g., owner name or additional info)
 * @param showBackButton - Show back button instead of logo
 */
const HeaderOwner: React.FC<HeaderOwnerProps> = ({ 
  title = "", 
  subtitle = "",
  showBackButton = false
}) => {
  return (
    <UniversalHeader
      title={title}
      subtitle={subtitle}
      showLogo={!showBackButton}
      showBackButton={showBackButton}
      onLogoPress={() => router.push("/(owners)/home")}
      variant="default"
    />
  );
};

export default HeaderOwner;
