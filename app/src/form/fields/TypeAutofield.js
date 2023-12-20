import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { FieldLabel } from '../support';
import { styles } from '../styles';
import { Input } from '@rneui/themed';

const fnRegex = /^function(?:.+)?(?:\s+)?\((.+)?\)(?:\s+|\n+)?\{(?:\s+|\n+)?((?:.|\n)+)\}$/m;
const fnEcmaRegex = /^\((.+)?\)(?:\s+|\n+)?=>(?:\s+|\n+)?((?:.|\n)+)$/m;
const sanitize = [
  {
    prefix: /return fetch|fetch/g,
    re: /return fetch(\(.+)\} +|fetch(\(.+)\} +/,
    log: 'Fetch is not allowed.',
  },
];

const checkDirty = (fnString) => {
  return sanitize.reduce((prev, sn) => {
    const dirty = prev.match(sn.re);
    if (dirty) {
      return prev.replace(sn.prefix, '').replace(dirty[1], `console.error("${sn.log}");`);
    }
    return prev;
  }, fnString);
};

const getFnMetadata = (fnString) => {
  const fnMetadata = fnRegex.exec(fnString) || fnEcmaRegex.exec(fnString);
  if (fnMetadata?.length >= 3) {
    const fn = fnMetadata[2].split(' ');
    return fn[0] === 'return' ? fnMetadata[2] : `return ${fnMetadata[2]}`;
  }
  return false;
};

// convert fn string to array
const fnToArray = (fnString) => {
  const regex = /\#\d+|[(),?;&.'":()+\-*/.]|<=|<|>|>=|!=|==|[||]{2}|=>|\w+| /g;
  return fnString.match(regex);
};

const generateFnBody = (fnMetadata, values) => {
  if (!fnMetadata) {
    return false;
  }

  const fnMetadataTemp = fnToArray(fnMetadata);

  // save defined condition to detect how many condition on fn
  // or save the total of condition inside fn string
  const fnBodyTemp = [];

  // generate the fnBody
  const fnBody = fnMetadataTemp.map((f) => {
    const meta = f.match(/#([0-9]*)/);
    if (meta) {
      fnBodyTemp.push(f); // save condition
      let val = values?.[meta[1]];
      if (!val) {
        return null;
      }
      if (typeof val === 'object') {
        if (Array.isArray(val)) {
          val = val.join(',');
        } else {
          if (val?.lat) {
            val = `${val.lat},${val.lng}`;
          } else {
            val = null;
          }
        }
      }
      if (typeof val === 'number') {
        val = Number(val);
      }
      if (typeof val === 'string') {
        val = `"${val}"`;
      }
      const fnMatch = f.match(/#([0-9]*|[0-9]*\..+)+/);
      if (fnMatch) {
        val = fnMatch[1] === meta[1] ? val : val + fnMatch[1];
      }
      return val;
    }
    const n = f.match(/(^[0-9]*$)/);
    if (n) {
      return Number(n[1]);
    }
    return f;
  });

  // all fn conditions meet, return generated fnBody
  if (!fnBody.filter((x) => !x).length) {
    return fnBody.join('');
  }

  // return false if generated fnBody contains null align with fnBodyTemp
  // or meet the total of condition inside fn string
  if (fnBody.filter((x) => !x).length === fnBodyTemp.length) {
    return false;
  }

  // remap fnBody if only one fnBody meet the requirements
  return fnBody
    .map((x, xi) => {
      if (!x) {
        const f = fnMetadataTemp[xi];
        const splitF = f.split('.');
        if (splitF.length) {
          splitF[0] = `"${splitF[0]}"`;
        }
        return splitF.join('.');
      }
      return x;
    })
    .join('');
};

const strToFunction = (fnString, values) => {
  fnString = checkDirty(fnString);
  const fnMetadata = getFnMetadata(fnString);
  const fnBody = generateFnBody(fnMetadata, values);
  try {
    return new Function(fnBody);
  } catch (error) {
    return false;
  }
};

const TypeAutofield = ({ onChange, values, keyform, id, name, tooltip, fn }) => {
  const [value, setValue] = useState(null);
  const [fieldColor, setFieldColor] = useState(null);
  const { fnString, fnColor } = fn;
  const automateValue = strToFunction(fnString, values);

  useEffect(() => {
    try {
      if (automateValue) {
        const _automateValue = automateValue();
        if (fnColor?.[_automateValue]) {
          setFieldColor(fnColor[_automateValue]);
        }
        setValue(_automateValue);
      } else {
        setValue(null);
      }
    } catch {
      setValue(null);
    }
  }, [automateValue, fnString, fnColor]);

  useEffect(() => {
    if (onChange) {
      onChange(id, value);
    }
  }, [value]);

  return (
    <View testID="type-autofield-wrapper">
      <FieldLabel keyform={keyform} name={name} tooltip={tooltip} />
      <Input
        inputContainerStyle={{
          ...styles.autoFieldContainer,
          backgroundColor: fieldColor || styles.autoFieldContainer.backgroundColor,
        }}
        value={value ? (value === NaN ? null : value.toString()) : null}
        testID="type-autofield"
        disabled
      />
    </View>
  );
};

export default TypeAutofield;
