# Supabase Integration Guide

## Prerequisites
- Supabase URL: `https://vyrwirioxoelcgrguxpq.supabase.co/`
- Supabase Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5cndpcmlveG9lbGNncmd1eHBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5MDIwMDIsImV4cCI6MjA2NzQ3ODAwMn0.iOogPOvFN0Kz3FsQe6xIq0vl3Dd0KQ3s1APfJyary_s`

## Setting Up Supabase Client

The project already has a Supabase client setup in `src/supabaseClient.js`. Here's how it works:

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

## Common Database Operations

### 1. Fetching Data
```javascript
// Fetch all rows from a table
const { data, error } = await supabase
  .from('your_table_name')
  .select('*')

// Fetch specific columns
const { data, error } = await supabase
  .from('your_table_name')
  .select('column1, column2, column3')

// Fetch with filters
const { data, error } = await supabase
  .from('your_table_name')
  .select('*')
  .eq('column_name', 'value')
```

### 2. Inserting Data
```javascript
// Insert a single row
const { data, error } = await supabase
  .from('your_table_name')
  .insert([
    { column1: 'value1', column2: 'value2' }
  ])

// Insert multiple rows
const { data, error } = await supabase
  .from('your_table_name')
  .insert([
    { column1: 'value1', column2: 'value2' },
    { column1: 'value3', column2: 'value4' }
  ])
```

### 3. Updating Data
```javascript
// Update rows that match the filter
const { data, error } = await supabase
  .from('your_table_name')
  .update({ column1: 'new_value' })
  .eq('id', 123)
```

### 4. Deleting Data
```javascript
// Delete rows that match the filter
const { data, error } = await supabase
  .from('your_table_name')
  .delete()
  .eq('id', 123)
```

## Advanced Queries

### 1. Filter Operations
```javascript
// Equal to
.eq('column', 'value')

// Not equal to
.neq('column', 'value')

// Greater than
.gt('column', 'value')

// Less than
.lt('column', 'value')

// Greater than or equal to
.gte('column', 'value')

// Less than or equal to
.lte('column', 'value')

// Like (pattern matching)
.like('column', '%pattern%')

// In list
.in('column', ['value1', 'value2'])
```

### 2. Ordering Results
```javascript
// Order by a column ascending
.order('column_name', { ascending: true })

// Order by a column descending
.order('column_name', { ascending: false })
```

### 3. Pagination
```javascript
// Limit number of rows
.limit(20)

// Get rows from offset
.range(0, 9) // Get first 10 rows
```

### 4. Joins
```javascript
// Join with another table
const { data, error } = await supabase
  .from('table1')
  .select(`
    id,
    column1,
    table2 (
      id,
      column2
    )
  `)
  .eq('table2.foreign_key', 'table1.id')
```

## Error Handling

Always check for errors in your Supabase operations:

```javascript
const { data, error } = await supabase
  .from('your_table_name')
  .select('*')

if (error) {
  console.error('Error:', error.message)
  // Handle the error appropriately
  return
}

// Process the data
console.log('Data:', data)
```

## Real-time Subscriptions

Supabase supports real-time data subscriptions:

```javascript
// Subscribe to all changes in a table
const subscription = supabase
  .from('your_table_name')
  .on('*', payload => {
    console.log('Change received!', payload)
  })
  .subscribe()

// Subscribe to specific changes
const subscription = supabase
  .from('your_table_name')
  .on('INSERT', payload => {
    console.log('Insert received!', payload)
  })
  .on('UPDATE', payload => {
    console.log('Update received!', payload)
  })
  .on('DELETE', payload => {
    console.log('Delete received!', payload)
  })
  .subscribe()

// Cleanup subscription when done
subscription.unsubscribe()
```

## Best Practices

1. **Error Handling:**
   - Always check for errors in responses
   - Implement proper error handling
   - Show appropriate user feedback

2. **Data Validation:**
   - Validate data before sending to Supabase
   - Use TypeScript for better type safety
   - Implement server-side validation rules

3. **Security:**
   - Never expose your Supabase key in client-side code
   - Use Row Level Security (RLS) policies
   - Implement proper authentication

4. **Performance:**
   - Use specific column selection instead of `select('*')`
   - Implement pagination for large datasets
   - Use appropriate indexes on your tables

5. **Real-time:**
   - Clean up subscriptions when components unmount
   - Be selective about what data to subscribe to
   - Handle connection errors appropriately

## Example Implementation

Here's a complete example of a component that fetches and displays data:

```javascript
import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

function DataComponent() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('your_table')
        .select('*')
      
      if (error) throw error

      setData(data)
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>
  
  return (
    <div>
      {data?.map(item => (
        <div key={item.id}>
          {/* Display your data */}
        </div>
      ))}
    </div>
  )
}

export default DataComponent
```

Remember to handle errors appropriately and implement proper loading states in your components. The example above demonstrates a basic pattern for fetching and displaying data from Supabase in a React component.