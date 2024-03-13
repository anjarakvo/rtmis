import React from 'react';
import { View } from 'react-native';
import { Input } from '@rneui/themed';
import PropTypes from 'prop-types';
import { FieldLabel } from '../support';
import styles from '../styles';

const TypeText = ({
  onChange,
  value,
  keyform,
  id,
  label,
  tooltip,
  required,
  requiredSign,
  meta_uuid: metaUUID,
  disabled,
}) => {
  const requiredValue = required ? requiredSign : null;
  return (
    <View>
      <FieldLabel keyform={keyform} name={label} tooltip={tooltip} requiredSign={requiredValue} />
      <Input
        inputContainerStyle={styles.inputFieldContainer}
        multiline
        numberOfLines={1}
        onChangeText={(val) => {
          if (onChange) {
            onChange(id, val);
          }
        }}
        value={value}
        testID="type-text"
        disabled={metaUUID || disabled}
      />
    </View>
  );
};

export default TypeText;

TypeText.propTypes = {
  onChange: PropTypes.func.isRequired,
  value: PropTypes.arrayOf().isRequired,
  keyform: PropTypes.number.isRequired,
  id: PropTypes.number.isRequired,
  label: PropTypes.string.isRequired,
  tooltip: PropTypes.string.isRequired,
  required: PropTypes.bool.isRequired,
  requiredSign: PropTypes.string,
  disabled: PropTypes.bool,
  meta_uuid: PropTypes.bool,
};

TypeText.defaultProps = {
  disabled: false,
  meta_uuid: false,
  requiredSign: null,
};
