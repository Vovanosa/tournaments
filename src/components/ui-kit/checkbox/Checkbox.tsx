import { FunctionComponent } from 'react';
import styles from './Checkbox.module.scss';

interface CheckboxProps {
  isChecked: boolean;
  onChange: () => void;
  children?: string;
  disabled?: boolean;
}

const Checkbox: FunctionComponent<CheckboxProps> = (props) => {
  const { isChecked, onChange, children, disabled } = props;

  return (
    <>
      <input
        disabled={disabled}
        type='checkbox'
        checked={isChecked}
        onChange={onChange}
        style={styles}
      />
      {children}
    </>
  );
};

export default Checkbox;
