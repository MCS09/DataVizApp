using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace DataVizApp.Models;

[Table("dataset_columns")]
[Index("DatasetId", "ColumnName", Name = "uq_dataset_columns", IsUnique = true)]
public partial class DatasetColumn
{
    [Key]
    [Column("dataset_id")]
    public int DatasetId { get; set; }

    [Key]
    [Column("column_number")]
    public int ColumnNumber { get; set; }

    [Column("column_name")]
    [StringLength(255)]
    public required string ColumnName { get; set; }

    [Column("column_description")]
    [StringLength(255)]
    public required string ColumnDescription { get; set; }  

    [Column("data_type")]
    [StringLength(50)]
    public required string DataType { get; set; }

    [Column("relationship")]
    public string? Relationship { get; set; }
}
