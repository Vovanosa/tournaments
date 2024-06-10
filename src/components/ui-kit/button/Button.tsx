import { FunctionComponent } from 'react';
import styles from './Button.module.scss';

interface ButtonProps {
  buttonText: string;
  handleClick: (name: string) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
}

const Button: FunctionComponent<ButtonProps> = (props) => {
  const { buttonText, handleClick, disabled, id, className } = props;
  return (
    <button
      className={className ? className : styles.button}
      onClick={() => {
        handleClick(buttonText);
      }}
      disabled={disabled}
      id={id}
    >
      {buttonText}
    </button>
  );
};

export default Button;
