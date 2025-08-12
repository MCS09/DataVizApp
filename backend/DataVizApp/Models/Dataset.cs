using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace DataVizApp.Models;

[Table("datasets")]
public partial class Dataset
{
    [Key]
    [Column("dataset_id")]
    public int DatasetId { get; set; }

    [Column("user_id")]
    public required string UserId { get; set; }
}
