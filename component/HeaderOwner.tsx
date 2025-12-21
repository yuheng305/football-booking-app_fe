import React from "react";
import { router } from "expo-router";
import UniversalHeader from "./UniversalHeader";

type HeaderProps = {
  location?: string;
  time?: string;
};

const HeaderOwner: React.FC<HeaderProps> = ({ location, time }) => {
  return (
    <UniversalHeader
      title={location}
      subtitle={time}
      showLogo={true}
      onLogoPress={() => router.push("/(owners)/home")}
      variant="default"
    />
  );
};

export default HeaderOwner;
