import { FunctionComponent } from "react";
import styles from "./Selector.module.scss";

interface SelectorProps {
  defaultOption: string;
  options: string[];
  setSelectedValue: (value: string) => void;
}

const Selector: FunctionComponent<SelectorProps> = (props) => {
  const { defaultOption, options, setSelectedValue } = props;

  return (
    <select
      className={styles.select}
      onChange={(e) => {
        setSelectedValue(e.target.value);
      }}>
      <option>{defaultOption}</option>
      {options.map((option, key) => (
        <option key={key} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
};

export default Selector;
