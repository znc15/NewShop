package model

import "gorm.io/gorm"

const (
	PageStatusDraft     = 0
	PageStatusPublished = 1
)

type Page struct {
	gorm.Model
	Slug      string `gorm:"uniqueIndex;size:100;not null" json:"slug"`
	Title     string `gorm:"size:200;not null" json:"title"`
	Content   string `gorm:"type:text" json:"content"`
	MetaTitle string `gorm:"size:200" json:"meta_title"`
	MetaDesc  string `gorm:"size:500" json:"meta_desc"`
	Status    int    `gorm:"default:0" json:"status"`
	SortOrder int    `gorm:"default:0" json:"sort_order"`
}

func (Page) TableName() string {
	return "pages"
}
