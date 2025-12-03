import React, { useState, useEffect, useMemo } from 'react';
import { Upload, Download, RotateCcw, Search, ChevronUp, ChevronDown, FileText, BookOpen, Filter } from 'lucide-react';
import Papa from 'papaparse';

const CSVBookManager = () => {
  const [originalData, setOriginalData] = useState([]);
  const [currentData, setCurrentData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [modifiedRows, setModifiedRows] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [filterColumn, setFilterColumn] = useState('all');
  const [fileName, setFileName] = useState('');
  const rowsPerPage = 50;

  // Generate sample data if no file is uploaded
  const generateSampleData = () => {
    const genres = ['Fiction', 'Non-Fiction', 'Mystery', 'Romance', 'Sci-Fi', 'Fantasy', 'Biography', 'History', 'Science', 'Technology'];
    const authors = [
      'Jane Smith', 'John Doe', 'Emily Johnson', 'Michael Brown', 'Sarah Wilson',
      'David Miller', 'Lisa Garcia', 'Robert Taylor', 'Maria Rodriguez', 'James Anderson',
      'Jennifer Davis', 'William Martinez', 'Elizabeth Lopez', 'Thomas Wilson', 'Margaret Clark',
      'Christopher Lee', 'Patricia Young', 'Daniel Hall', 'Linda Allen', 'Mark Wright'
    ];
    
    const titlePrefixes = ['The', 'A', 'An', 'Beyond', 'Through', 'Into', 'Under', 'Over', 'Behind', 'Across'];
    const titleWords = ['Mystery', 'Adventure', 'Journey', 'Quest', 'Story', 'Tale', 'Chronicle', 'Legend', 'Secret', 'Shadow', 'Light', 'Dream', 'Vision', 'Hope', 'Truth', 'Power', 'Magic', 'Wonder', 'Miracle', 'Discovery'];
    
    const data = [];
    for (let i = 1; i <= 10000; i++) {
      const prefix = titlePrefixes[Math.floor(Math.random() * titlePrefixes.length)];
      const word1 = titleWords[Math.floor(Math.random() * titleWords.length)];
      const word2 = titleWords[Math.floor(Math.random() * titleWords.length)];
      
      data.push({
        id: i,
        Title: `${prefix} ${word1} of ${word2}`,
        Author: authors[Math.floor(Math.random() * authors.length)],
        Genre: genres[Math.floor(Math.random() * genres.length)],
        PublishedYear: Math.floor(Math.random() * (2024 - 1950) + 1950),
        ISBN: `978-${Math.floor(Math.random() * 9)}${Math.floor(Math.random() * 100000000).toString().padStart(9, '0')}`
      });
    }
    return data;
  };

  useEffect(() => {
    // Load sample data on component mount
    const sampleData = generateSampleData();
    setOriginalData(sampleData);
    setCurrentData(sampleData);
    setFilteredData(sampleData);
    setFileName('sample-books.csv');
  }, []);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setFileName(file.name);

    Papa.parse(file, {
      complete: (results) => {
        try {
          const headers = results.data[0];
          const rows = results.data.slice(1).filter(row => row.some(cell => cell?.trim()));
          
          const parsedData = rows.map((row, index) => {
            const obj = { id: index + 1 };
            headers.forEach((header, i) => {
              obj[header.trim()] = row[i] || '';
            });
            return obj;
          });

          setOriginalData(parsedData);
          setCurrentData(parsedData);
          setFilteredData(parsedData);
          setModifiedRows(new Set());
          setCurrentPage(1);
        } catch (error) {
          alert('Error parsing CSV file. Please check the format.');
        }
        setLoading(false);
      },
      header: false,
      skipEmptyLines: true,
      error: (error) => {
        alert('Error reading file: ' + error.message);
        setLoading(false);
      }
    });
  };

  const handleCellEdit = (rowId, field, value) => {
    const newData = currentData.map(row => 
      row.id === rowId ? { ...row, [field]: value } : row
    );
    
    setCurrentData(newData);
    setModifiedRows(prev => new Set([...prev, rowId]));
    
    // Update filtered data as well
    const newFilteredData = filteredData.map(row => 
      row.id === rowId ? { ...row, [field]: value } : row
    );
    setFilteredData(newFilteredData);
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedAndFilteredData = useMemo(() => {
    let filtered = currentData.filter(row => {
      const searchValue = searchTerm.toLowerCase();
      if (filterColumn === 'all') {
        return Object.values(row).some(value => 
          value.toString().toLowerCase().includes(searchValue)
        );
      } else {
        return row[filterColumn]?.toString().toLowerCase().includes(searchValue) || false;
      }
    });

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        
        // Handle numeric sorting for year
        if (sortConfig.key === 'PublishedYear') {
          aValue = parseInt(aValue) || 0;
          bValue = parseInt(bValue) || 0;
        } else {
          aValue = aValue?.toString().toLowerCase() || '';
          bValue = bValue?.toString().toLowerCase() || '';
        }
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [currentData, searchTerm, filterColumn, sortConfig]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return sortedAndFilteredData.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedAndFilteredData, currentPage]);

  const totalPages = Math.ceil(sortedAndFilteredData.length / rowsPerPage);

  const handleDownload = () => {
    const headers = ['Title', 'Author', 'Genre', 'PublishedYear', 'ISBN'];
    const csvData = [
      headers,
      ...currentData.map(row => headers.map(header => row[header] || ''))
    ];
    
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.replace('.csv', '') + '_edited.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setCurrentData([...originalData]);
    setFilteredData([...originalData]);
    setModifiedRows(new Set());
    setSearchTerm('');
    setSortConfig({ key: null, direction: 'asc' });
    setCurrentPage(1);
  };

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) return <ChevronUp className="w-3 h-3 opacity-30" />;
    return sortConfig.direction === 'asc' ? 
      <ChevronUp className="w-3 h-3 text-blue-500" /> : 
      <ChevronDown className="w-3 h-3 text-blue-500" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading CSV data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br to-indigo-100">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-indigo-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-800">CSV BULK DATASET IN WEB APP</h1>
                <p className="text-gray-600">View,Upload,edit,Filter and Download Format </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <label className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg cursor-pointer transition-colors flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload CSV
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              
              <button
                onClick={handleDownload}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              
              
            </div>
          </div>
        </div>

        {/* Stats and Controls */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-500" />
                <span className="text-gray-600">
                  <span className="font-semibold text-gray-800">{sortedAndFilteredData.length}</span> records
                  {sortedAndFilteredData.length !== currentData.length && (
                    <span className="text-sm text-gray-500"> (of {currentData.length})</span>
                  )}
                </span>
              </div>
              
              <div className="text-gray-600">
                <span className="font-semibold text-orange-600">{modifiedRows.size}</span> modified
              </div>
              
              <div className="text-gray-600">
                Page <span className="font-semibold">{currentPage}</span> of <span className="font-semibold">{totalPages}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-64">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search books..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filterColumn}
                onChange={(e) => {
                  setFilterColumn(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All Columns</option>
                <option value="Title">Title</option>
                <option value="Author">Author</option>
                <option value="Genre">Genre</option>
                <option value="PublishedYear">Year</option>
                <option value="ISBN">ISBN</option>
              </select>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Title', 'Author', 'Genre', 'PublishedYear', 'ISBN'].map((header) => (
                    <th
                      key={header}
                      className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort(header)}
                    >
                      <div className="flex items-center justify-between">
                        {header}
                        <SortIcon column={header} />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedData.map((row) => (
                  <tr 
                    key={row.id} 
                    className={`hover:bg-gray-50 transition-colors ${
                      modifiedRows.has(row.id) ? 'bg-yellow-50' : ''
                    }`}
                  >
                    {['Title', 'Author', 'Genre', 'PublishedYear', 'ISBN'].map((field) => (
                      <td key={field} className="px-4 py-3">
                        <input
                          type="text"
                          value={row[field] || ''}
                          onChange={(e) => handleCellEdit(row.id, field, e.target.value)}
                          className={`w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                            modifiedRows.has(row.id) ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300'
                          }`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {(currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, sortedAndFilteredData.length)} of {sortedAndFilteredData.length} results
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  <div className="flex items-center gap-1">
                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1 text-sm border rounded ${
                            currentPage === pageNum
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CSVBookManager;