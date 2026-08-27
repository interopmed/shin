import React from 'react';

interface ParameterInfo {
  id: number;
  name: string;
  display_name: string;
  ref_val_lower?: number | string;
  ref_val_upper?: number | string;
  ref_val_lower_f?: number | string;
  ref_val_upper_f?: number | string;
  ref_val_sub_1?: number | string;
  ref_val_sub_2?: number | string;
  unit?: string;
  notes?: string;
}

interface TestValue {
  id?: number;
  value?: number | string;
}

interface LabParameterProps {
  parameterInfo: ParameterInfo;
  test?: TestValue;
  isEditable?: boolean;
  onValueChange?: (name: string, value: string, testId?: number) => void;
  allowNameFallback?: boolean;
  refValSub1?: number | string;
  refValSub1Upper?: number | string;
  refValSub2?: number | string;
  refValSub2ForS3?: number | string;
  level4?: boolean;
  notes?: string;
}

const LabParameter: React.FC<LabParameterProps> = ({
  parameterInfo,
  test,
  isEditable = false,
  onValueChange,
  allowNameFallback = true,
  refValSub1,
  refValSub1Upper,
  refValSub2,
  refValSub2ForS3,
  level4,
  notes
}) => {
  const unitText = parameterInfo.unit || '';

  const toNumber = (value?: number | string) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'number') return Number.isNaN(value) ? undefined : value;
    const trimmed = value.toString().trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? undefined : parsed;
  };

  const getNumericTestValue = () => {
    if (test?.value === undefined || test?.value === null) return undefined;
    if (typeof test.value === 'number') return Number.isNaN(test.value) ? undefined : test.value;
    const trimmed = test.value.toString().trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? undefined : parsed;
  };

  const refLower = toNumber(parameterInfo.ref_val_lower);
  const refUpper = toNumber(parameterInfo.ref_val_upper);
  const refLowerF = toNumber(parameterInfo.ref_val_lower_f);
  const refUpperF = toNumber(parameterInfo.ref_val_upper_f);
  const refSub1 = toNumber(parameterInfo.ref_val_sub_1);
  const refSub2 = toNumber(parameterInfo.ref_val_sub_2);
  const refSub1Value = toNumber(refValSub1);
  const refSub1UpperValue = toNumber(refValSub1Upper);
  const refSub2Value = toNumber(refValSub2);
  const refSub2ForS3Value = toNumber(refValSub2ForS3);

  const getResultFlag = (): string => {
    const value = getNumericTestValue();
    if (value === undefined) return '';

    // Special case for parameter ID 24
    if (parameterInfo.id === 24) {
      return `(${value >= 8 ? 'Positive' : 'Negative'})`;
    }

    if (refUpper !== undefined && refUpper !== 0) {
      if (value < (refLower ?? 0)) {
        return 'LOW';
      }

      if (value > refUpper) {
        if (refSub1 !== undefined) {
          if (value < refSub1) {
            return 'BORDERLINE HIGH';
          } else if (refSub2 !== undefined) {
            return value >= refSub1 && value < refSub2
              ? 'HIGH'
              : 'VERY HIGH';
          } else {
            return 'HIGH';
          }
        }
        return 'HIGH';
      }
    }

    return '';
  };

  const formatTestValue = (): string => {
    if (test?.value === undefined || test?.value === null || test?.value === '') return '0.00';

    const numericValue = getNumericTestValue();
    const value = numericValue !== undefined ? numericValue : test.value;

    // Special case for parameter ID 24
    if (parameterInfo.id === 24 && typeof value === 'number') {
      return value >= 8 ? value.toString() : '< 8';
    }

    let formattedValue = value.toString();

    // Add /hpf suffix for PUS or RED parameters
    if ((parameterInfo.name === 'PUS' || parameterInfo.name === 'RED') && value.toString() !== 'Nill') {
      formattedValue += ' /hpf';
    }

    return formattedValue;
  };

  const getReferenceValue = (): string => {
    if (notes) return '';

    if (refSub1Value !== undefined) {
      if (refSub2Value !== undefined) {
        return `> ${refSub2Value}`;
      } else if (refSub1UpperValue !== undefined) {
        if (level4 && refSub2ForS3Value !== undefined) {
          const decimals = (refSub1UpperValue.toString().split('.')[1] || '').length;
          const inc = decimals === 0 ? 1 : decimals === 1 ? 0.1 : 0.01;
          return `${refSub1UpperValue} - ${refSub2ForS3Value - inc}`;
        }
        return `> ${refSub1UpperValue}`;
      } else if (refUpper !== undefined) {
        const decimals = (refUpper.toString().split('.')[1] || '').length;
        const inc = decimals === 0 ? 1 : decimals === 1 ? 0.1 : 0.01;
        return `${refUpper} - ${refSub1Value - inc}`;
      }
    } else if (refUpper !== undefined && refUpper !== 0) {
      // Gender-specific values
      if (refLowerF !== undefined || refUpperF !== undefined) {
        const maleLower = refLower ?? '';
        const maleUpper = refUpper ?? '';
        const femaleLower = refLowerF ?? '';
        const femaleUpper = refUpperF ?? '';

        return `${maleLower ? maleLower + ' - ' : '< '}${maleUpper} - Male\n${femaleLower ? femaleLower + ' - ' : '< '}${femaleUpper} - Female`;
      }

      const lower = refLower !== undefined ? `${refLower} - ` : '< ';
      return `${lower}${refUpper}`;
    }

    return '';
  };

  const getRefFlag = (): string => {
    if (refSub1Value !== undefined) {
      if (refSub2Value !== undefined) return 'Very High';
      if (refSub1UpperValue !== undefined) return 'High';
      return 'Borderline High';
    }

    if (!parameterInfo.notes && refSub1 !== undefined) {
      return 'Normal';
    }

    return '';
  };

  return (
    <tr>
      <td className="parameter">
        <p>{parameterInfo.display_name || (allowNameFallback ? parameterInfo.name : '')}</p>
      </td>

      <td className="result">
        <span className="result-value">
          {isEditable && !refValSub1 && !notes ? (
            <>
              <input
                type="text"
                className="form-control"
                name={parameterInfo.name.toLowerCase()}
                defaultValue={test?.value?.toString() || ''}
                onChange={(e) => onValueChange?.(parameterInfo.name.toLowerCase(), e.target.value, test?.id)}
              />
              <input type="hidden" name={`${parameterInfo.name.toLowerCase()}_id`} value={test?.id || ''} />
            </>
          ) : (
            formatTestValue()
          )}
        </span>

        <span className="result-flag ml-2 font-weight-bold text-danger">
          {getResultFlag()}
        </span>
      </td>

      <td className="reference">
        {notes || ''}
        <span className="ref_value">
          {getReferenceValue()}
        </span>
        {getRefFlag() && <span className="ref_flag ml-2 text-success">{getRefFlag()}</span>}
      </td>

      <td className="unit">
        <p>{!notes && unitText ? unitText : ''}</p>
      </td>
    </tr>
  );
};

export default LabParameter;
