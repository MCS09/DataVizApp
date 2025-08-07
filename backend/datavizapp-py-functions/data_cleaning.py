"""
End to End Data Cleaning Pipeline
=================================

Features
--------
* Load data (CSV, Excel, JSON, Parquet …)
* Standardize column names
* Detect & remove duplicates
* Identify & visualize missing values
* Impute / drop missing data (numeric, categorical, datetime)
* Cast columns to appropriate dtypes
* Parse dates & extract useful components
* Detect & treat outliers (IQR, Z-score)
* Encode categorical variables (one-hot / ordinal)
* Scale / normalize numeric features
* Save the cleaned dataframe

Usage
-----
>>> from data_cleaner import DataCleaner
>>> cleaner = DataCleaner(
...     drop_duplicates=True,
...     impute_numeric='median',
...     impute_categorical='most_frequent',
...     outlier_method='iqr',
...     encode_method='onehot',
...     scaling_method='standard',
... )
>>> df_clean = cleaner.fit_transform("raw_data.csv")
>>> df_clean.to_parquet("cleaned_data.parquet")
"""

# --------------------------------------------------------------------------- #
# Imports
# --------------------------------------------------------------------------- #
import os
import re
import warnings
from pathlib import Path
from typing import List, Optional, Union, Dict, Callable

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# Scikit‑learn utilities (imputation, encoding, scaling)
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import OneHotEncoder, OrdinalEncoder, StandardScaler, MinMaxScaler, RobustScaler

# --------------------------------------------------------------------------- #
# Helper utilities
# --------------------------------------------------------------------------- #
def snake_case(col: str) -> str:
    """
    Convert a column name to snake_case.
    """
    col = re.sub(r'[\W]+', '_', col)  # replace non‑alphanum with _
    col = re.sub(r'(?<!^)(?=[A-Z])', '_', col).lower()
    col = re.sub(r'_+', '_', col).strip('_')
    return col


def visualize_missing(df: pd.DataFrame, figsize=(10, 6)):
    """
    Plot a heatmap of missing values.
    """
    plt.figure(figsize=figsize)
    sns.heatmap(df.isnull(), cbar=False, yticklabels=False, cmap="viridis")
    plt.title("Missing Value Heatmap")
    plt.show()


def detect_outliers_iqr(series: pd.Series, factor: float = 1.5) -> pd.Series:
    """
    Return a boolean mask where True marks an outlier based on IQR.
    """
    q1, q3 = series.quantile([0.25, 0.75])
    iqr = q3 - q1
    lower, upper = q1 - factor * iqr, q3 + factor * iqr
    return (series < lower) | (series > upper)


def detect_outliers_zscore(series: pd.Series, threshold: float = 3.0) -> pd.Series:
    """
    Return a boolean mask where True marks an outlier based on Z‑score.
    """
    if series.dtype.kind not in "biufc":   # non‑numeric
        raise TypeError("Z‑score based outlier detection works only on numeric columns.")
    z = np.abs((series - series.mean()) / series.std(ddof=0))
    return z > threshold


# --------------------------------------------------------------------------- #
# Main Cleaner Class
# --------------------------------------------------------------------------- #
class DataCleaner(BaseEstimator, TransformerMixin):
    """
    A scikit‑learn compatible transformer that applies a full suite of
    cleaning steps to a pandas DataFrame.

    Parameters
    ----------
    drop_duplicates : bool, default True
        Whether to drop exact duplicate rows.

    missing_threshold : float, default 0.5
        Columns with a higher proportion of missing values than this
        threshold are dropped automatically.

    impute_numeric : str or Callable, default 'median'
        Strategy for numeric imputation (see ``sklearn.impute.SimpleImputer``)
        or a custom callable that receives a Series and returns a filled Series.

    impute_categorical : str or Callable, default 'most_frequent'
        Same idea as ``impute_numeric`` but for object/category columns.

    outlier_method : str or None, default 'iqr'
        How to treat outliers:
        * 'iqr'  – mask using IQR and replace with NaN (later imputed)
        * 'zscore' – mask using Z‑score and replace with NaN
        * None – do nothing.

    outlier_replace : str, default 'nan'
        What to do with detected outliers:
        * 'nan' – replace them with NaN (so they can be imputed)
        * 'cap' – winsorize (cap to nearest non‑outlier bound)

    encode_method : str, default 'onehot'
        Encoding for categorical columns:
        * 'onehot' – scikit‑learn OneHotEncoder (produces a dense DataFrame)
        * 'ordinal' – OrdinalEncoder (useful for tree‑based models)
        * None – leave as is.

    scaling_method : str, default 'standard'
        Scaling for numeric features:
        * 'standard' – zero‑mean, unit‑variance (StandardScaler)
        * 'minmax' – scale to [0, 1] (MinMaxScaler)
        * 'robust' – robust to outliers (RobustScaler)
        * None – no scaling.

    datetime_formats : list, optional
        List of datetime parse formats to try (fallback to pandas `to_datetime`).

    verbose : bool, default True
        Print progress messages.
    """

    # ------------------------------------------------------------------- #
    # Constructor & internal helpers
    # ------------------------------------------------------------------- #
    def __init__(
        self,
        drop_duplicates: bool = True,
        missing_threshold: float = 0.5,
        impute_numeric: Union[str, Callable] = "median",
        impute_categorical: Union[str, Callable] = "most_frequent",
        outlier_method: Optional[str] = "iqr",
        outlier_replace: str = "nan",
        encode_method: Optional[str] = "onehot",
        scaling_method: Optional[str] = "standard",
        datetime_formats: Optional[List[str]] = None,
        verbose: bool = True,
    ):
        self.drop_duplicates = drop_duplicates
        self.missing_threshold = missing_threshold
        self.impute_numeric = impute_numeric
        self.impute_categorical = impute_categorical
        self.outlier_method = outlier_method
        self.outlier_replace = outlier_replace
        self.encode_method = encode_method
        self.scaling_method = scaling_method
        self.datetime_formats = datetime_formats or []
        self.verbose = verbose

        # Placeholders that will be fitted lazily
        self._numeric_imputer = None
        self._categorical_imputer = None
        self._encoder = None
        self._scaler = None
        self._original_columns = None  # keep order for later re‑assembly

    # ------------------------------------------------------------------- #
    # Core API
    # ------------------------------------------------------------------- #
    def fit(self, df: pd.DataFrame, y=None):
        """
        Fit the cleaning pipeline – mainly learns imputation values,
        encoders, and scalers. ``df`` must be a DataFrame.
        """
        df = df.copy()
        self._original_columns = df.columns.tolist()

        # 1. Standardize column names up‑front
        df = self._standardize_column_names(df)

        # 2. Detect column dtypes (numeric, categorical, datetime candidates)
        self._numeric_cols = df.select_dtypes(include=np.number).columns.tolist()
        self._categorical_cols = df.select_dtypes(include=["object", "category"]).columns.tolist()
        self._datetime_cols = self._detect_datetime_candidates(df)

        # 3. Fit imputers
        if self.impute_numeric:
            self._numeric_imputer = self._make_imputer(self.impute_numeric, "numeric")
            self._numeric_imputer.fit(df[self._numeric_cols])

        if self.impute_categorical:
            self._categorical_imputer = self._make_imputer(self.impute_categorical, "categorical")
            self._categorical_imputer.fit(df[self._categorical_cols])

        # 4. Fit encoder (if any)
        if self.encode_method:
            self._encoder = self._make_encoder(self.encode_method)
            self._encoder.fit(df[self._categorical_cols])

        # 5. Fit scaler (if any)
        if self.scaling_method:
            self._scaler = self._make_scaler(self.scaling_method)
            self._scaler.fit(df[self._numeric_cols])

        if self.verbose:
            print("[fit] Finished fitting pipeline components.")
        return self

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Apply the cleaning steps to ``df`` (a DataFrame) and
        return a cleaned DataFrame.
        """
        df = df.copy()

        # 0. Ensure the same column order / names as the fit data
        df = self._standardize_column_names(df)

        # 1. Drop duplicates (if requested)
        if self.drop_duplicates:
            before = len(df)
            df = df.drop_duplicates()
            if self.verbose:
                print(f"[transform] Dropped {before - len(df)} duplicate rows.")

        # 2. Remove columns with > missing_threshold missingness
        missing_frac = df.isnull().mean()
        cols_to_drop = missing_frac[missing_frac > self.missing_threshold].index.tolist()
        if cols_to_drop:
            df = df.drop(columns=cols_to_drop)
            if self.verbose:
                print(f"[transform] Dropped columns with >{self.missing_threshold:.0%} missing values: {cols_to_drop}")

        # 3. Parse datetime columns
        df = self._parse_datetimes(df)

        # Identify numeric/categorical columns anew after possible column drops
        numeric_cols = df.select_dtypes(include=np.number).columns.tolist()
        categorical_cols = df.select_dtypes(include=["object", "category"]).columns.tolist()

        # 4. Outlier detection & handling (numeric only)
        if self.outlier_method:
            df = self._handle_outliers(df, numeric_cols)

        # 5. Impute missing values
        df = self._impute_missing(df, numeric_cols, categorical_cols)

        # 6. Encode categoricals
        if self.encode_method:
            df = self._encode_categoricals(df, categorical_cols)

        # 7. Scale numeric features
        if self.scaling_method:
            df = self._scale_numeric(df, numeric_cols)

        # 8. (Optional) Visualize missingness after cleaning (useful for debugging)
        if self.verbose:
            print("[transform] Missing value summary after cleaning:")
            print(df.isnull().sum())

        # Preserve column order: any newly generated columns (e.g., one‑hot) are
        # appended after original ones.
        if self._original_columns:
            # Pull original columns that still exist, then the rest.
            ordered = [c for c in self._original_columns if c in df.columns]
            ordered += [c for c in df.columns if c not in ordered]
            df = df[ordered]

        return df

    def fit_transform(self, df: pd.DataFrame, y=None) -> pd.DataFrame:
        """
        Convenience wrapper – fit then transform.
        """
        return self.fit(df, y).transform(df)

    # ------------------------------------------------------------------- #
    # Private helper methods
    # ------------------------------------------------------------------- #


    @staticmethod
    def _standardize_column_names(df: pd.DataFrame) -> pd.DataFrame:
        df = df.rename(columns=lambda col: snake_case(str(col)))
        return df

    def _detect_datetime_candidates(self, df: pd.DataFrame) -> List[str]:
        """
        Heuristics to decide which columns *might* be dates:
        * dtype is object
        * column name contains keywords (date, time, year, month, day)
        """
        candidates = []
        date_keywords = ["date", "time", "year", "month", "day", "timestamp"]
        for col in df.columns:
            if df[col].dtype == "object" and any(k in col.lower() for k in date_keywords):
                candidates.append(col)
        return candidates

    def _parse_datetimes(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Try parsing each candidate column using pandas `to_datetime`.
        If `datetime_formats` is provided, attempt formats in order before falling back.
        """
        for col in self._datetime_cols:
            if col not in df.columns:
                continue  # column may have been dropped earlier
            # First try user‑supplied formats (if any)
            parsed = None
            for fmt in self.datetime_formats:
                try:
                    parsed = pd.to_datetime(df[col], format=fmt, errors="raise")
                    break
                except Exception:
                    continue
            # Fallback to pandas' own parser
            if parsed is None:
                parsed = pd.to_datetime(df[col], errors="coerce", infer_datetime_format=True)

            # Replace original column with datetime dtype
            df[col] = parsed

            # Optional: expand to useful components (year, month, day, etc.)
            if parsed.notna().any():
                df[f"{col}_year"] = parsed.dt.year
                df[f"{col}_month"] = parsed.dt.month
                df[f"{col}_day"] = parsed.dt.day
                df[f"{col}_weekday"] = parsed.dt.weekday
                df[f"{col}_is_weekend"] = parsed.dt.weekday >= 5

                # Drop the original raw column if we only want the components
                df = df.drop(columns=[col])

        return df

    def _make_imputer(self, strategy, kind: str) -> SimpleImputer:
        """
        Build a SimpleImputer (or custom callable) based on ``strategy``.
        """
        if callable(strategy):
            # Wrap a custom callable as a SimpleImputer‑like object
            class CallableImputer:
                def fit(self, X):
                    return self

                def transform(self, X):
                    X_filled = X.copy()
                    for col in X_filled.columns:
                        X_filled[col] = strategy(X_filled[col])
                    return X_filled

            return CallableImputer()
        else:
            # For numeric we use a numeric dtype, for categorical we use object
            if kind == "numeric":
                return SimpleImputer(strategy=strategy, fill_value=0)
            elif kind == "categorical":
                return SimpleImputer(strategy=strategy, fill_value="missing")
            else:
                raise ValueError(f"Invalid kind for imputer: {kind}")

    def _impute_missing(
        self,
        df: pd.DataFrame,
        numeric_cols: List[str],
        categorical_cols: List[str],
    ) -> pd.DataFrame:
        """
        Apply fitted imputers to numeric and categorical columns.
        """
        if self._numeric_imputer:
            df[numeric_cols] = self._numeric_imputer.transform(df[numeric_cols])

        if self._categorical_imputer:
            df[categorical_cols] = self._categorical_imputer.transform(df[categorical_cols])

        return df

    def _make_encoder(self, method: str):
        """
        Build an encoder (OneHotEncoder or OrdinalEncoder) with sensible defaults.
        """
        if method == "onehot":
            return OneHotEncoder(sparse=False, handle_unknown="ignore")
        elif method == "ordinal":
            return OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1)
        else:
            raise ValueError(f"Unsupported encoding method: {method}")

    def _encode_categoricals(self, df: pd.DataFrame, categorical_cols: List[str]) -> pd.DataFrame:
        """
        Transform categorical columns according to the chosen encoder.
        Returned DataFrame contains the new encoded columns (dense) and drops the original ones.
        """
        if not categorical_cols:
            return df
        encoder = self._encoder
        # Fit/transform (fit already done in `.fit()`, transform only now)
        encoded_array = encoder.transform(df[categorical_cols])
        # Derive column names
        if isinstance(encoder, OneHotEncoder):
            encoded_cols = encoder.get_feature_names_out(categorical_cols)
        else:  # OrdinalEncoder
            encoded_cols = categorical_cols

        encoded_df = pd.DataFrame(encoded_array, columns=encoded_cols, index=df.index)

        # Concatenate and drop originals
        df = pd.concat([df.drop(columns=categorical_cols), encoded_df], axis=1)

        if self.verbose:
            print(f"[encode] Encoded {len(categorical_cols)} categorical columns using {self.encode_method}.")
        return df

    def _make_scaler(self, method: str):
        """
        Build a numeric scaler.
        """
        if method == "standard":
            return StandardScaler()
        elif method == "minmax":
            return MinMaxScaler()
        elif method == "robust":
            return RobustScaler()
        else:
            raise ValueError(f"Unsupported scaling method: {method}")

    def _scale_numeric(self, df: pd.DataFrame, numeric_cols: List[str]) -> pd.DataFrame:
        """
        Apply the fitted scaler to numeric columns.
        """
        if not numeric_cols:
            return df
        scaler = self._scaler
        df[numeric_cols] = scaler.transform(df[numeric_cols])
        if self.verbose:
            print(f"[scale] Applied {self.scaling_method} scaling to {len(numeric_cols)} numeric columns.")
        return df

    def _handle_outliers(self, df: pd.DataFrame, numeric_cols: List[str]) -> pd.DataFrame:
        """
        Detect outliers using the selected method and either mask them as NaN
        (so they get imputed later) or winsorize them.
        """
        for col in numeric_cols:
            series = df[col]
            if self.outlier_method == "iqr":
                mask = detect_outliers_iqr(series)
            elif self.outlier_method == "zscore":
                mask = detect_outliers_zscore(series)
            else:
                raise ValueError(f"Invalid outlier method: {self.outlier_method}")

            if mask.sum() == 0:
                continue  # no outliers

            if self.outlier_replace == "nan":
                df.loc[mask, col] = np.nan
                if self.verbose:
                    print(f"[outlier] Set {mask.sum()} outliers in '{col}' to NaN (will be imputed).")
            elif self.outlier_replace == "cap":
                # Winsorization: cap at the nearest non‑outlier bound
                q1, q3 = series.quantile([0.25, 0.75])
                iqr = q3 - q1
                lower, upper = q1 - 1.5 * iqr, q3 + 1.5 * iqr
                df.loc[series < lower, col] = lower
                df.loc[series > upper, col] = upper
                if self.verbose:
                    print(f"[outlier] Winsorized {mask.sum()} outliers in '{col}'.")
            else:
                raise ValueError(f"Invalid outlier_replace option: {self.outlier_replace}")

        return df

    # ------------------------------------------------------------------- #
    # Utility methods (optional but nice to have)
    # ------------------------------------------------------------------- #
    def summary(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Return a quick summary DataFrame: dtype, missing%, unique values, etc.
        """
        summary = pd.DataFrame({
            "dtype": df.dtypes,
            "missing_pct": df.isnull().mean() * 100,
            "unique": df.nunique(),
            "num_rows": len(df)
        })
        return summary.sort_values("missing_pct", ascending=False)

    def plot_missing_matrix(self, df: pd.DataFrame, figsize=(12, 6)):
        """
        Plot a missingness matrix using seaborn's heatmap (alternatively,
        use missingno if installed).
        """
        visualize_missing(df, figsize=figsize)

# --------------------------------------------------------------------------- #
# Example usage (uncomment and adapt to your environment)
# --------------------------------------------------------------------------- #
if __name__ == "__main__":
    # Path to your raw dataset (CSV, Excel, JSON, Parquet …)
    raw_path = "data/raw/customers.csv"

    # Initialize a cleaner with the settings you need
    cleaner = DataCleaner(
        drop_duplicates=True,
        missing_threshold=0.6,
        impute_numeric="median",
        impute_categorical="most_frequent",
        outlier_method="iqr",
        outlier_replace="nan",          # you could also choose "cap"
        encode_method="onehot",
        scaling_method="standard",
        datetime_formats=["%Y-%m-%d", "%d/%m/%Y"],  # optional formats to try first
        verbose=True,
    )

    # Seperated concerns, now the files should be read only on client's end and only (small computed) metadata should be sent to LLM for further instruction (beginning agenic workflow)
    # Will perform this using Azure AI Foundry Agents (to build ai agents)
    df_raw = pd.read_csv(raw_path)
    df_clean = cleaner.fit_transform(df_raw)

    # Quick sanity check
    print("\n=== Cleaned Data Summary ===")
    print(cleaner.summary(df_clean).head(20))
