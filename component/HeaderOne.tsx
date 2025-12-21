import React from "react";
import UniversalHeader from "./UniversalHeader";

type HeaderProps = {
  title?: string;
};

const HeaderOne: React.FC<HeaderProps> = ({ title }) => {
  return <UniversalHeader title={title} showLogo={true} variant="default" />;
};

export default HeaderOne;
