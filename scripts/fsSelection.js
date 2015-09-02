var FireShotSelection = 
{
	holder 		: undefined,
	wrapper		: undefined,
	info		: undefined,
	doc			: undefined,
	body		: undefined,
	onSelected	: undefined,
	cursor  	: undefined,
	borders		: [],
	outer		: [],
	x1			: 0,
	y1			: 0,
	x2			: 0,
	y2			: 0,
	prevx		: 0,
	prevy		: 0,
	
	destroyed	: false,
	
	makeSelection : function(onSelected)
	{
		this.onSelected = onSelected;
		this.destroyed = false;
		
		with (this)
		{
			x1 = x2 = y1 = y2 = 0;
			
			doc	= window.document;
			body = doc.body;

			cursor = document.body.style.cursor;
			document.body.style.cursor = "crosshair";
			
			holder = document.createElement('div');
			holder.style.cssText = "position: absolute; left: 0px; top: 0px; width: 0px; height: 0px; z-index: 2147483640; cursor: crosshair;";
			
			info = document.createElement('div');
			info.style.cssText = "font-family: Tahoma; font-size:14px; color: #fff; left: 5px; top: 5px; width:auto; height:auto; padding: 3px; background: #000; opacity: 0.8; position:absolute; border:#333 solid 1px; cursor: crosshair;";
			
			wrapper = document.createElement('div');
		
			wrapper.style.cssText = "position: absolute; left: 0px; top: 0px; opacity: 0; cursor: crosshair; z-index: 2147483641;";
		
			document.body.appendChild(wrapper);
			
			for (var i = 0; i < 4; i ++)
			{
				borders.push(document.createElement('div'));
				
				var cssText;
				
				switch (i)
				{
					case 0: cssText = "background: url('data:image/gif;base64,R0lGODlhAQAGAKEAAP///wAAADY2Nv///yH/C05FVFNDQVBFMi4wAwEAAAAh/hpDcmVhdGVkIHdpdGggYWpheGxvYWQuaW5mbwAh+QQACgD/ACwAAAAAAQAGAAACAxQuUgAh+QQBCgADACwAAAAAAQAGAAACA5SAUgAh+QQBCgADACwAAAAAAQAGAAACA5SBBQAh+QQBCgADACwAAAAAAQAGAAACA4QOUAAh+QQBCgADACwAAAAAAQAGAAACAwSEUAAh+QQBCgADACwAAAAAAQAGAAACA4SFBQA7') repeat-y left top;"; break;
					case 1: cssText = "background: url('data:image/gif;base64,R0lGODlhBgABAKEAAP///wAAADY2Nv///yH/C05FVFNDQVBFMi4wAwEAAAAh/hpDcmVhdGVkIHdpdGggYWpheGxvYWQuaW5mbwAh+QQACgD/ACwAAAAABgABAAACAxQuUgAh+QQBCgADACwAAAAABgABAAACA5SAUgAh+QQBCgADACwAAAAABgABAAACA5SBBQAh+QQBCgADACwAAAAABgABAAACA4QOUAAh+QQBCgADACwAAAAABgABAAACAwSEUAAh+QQBCgADACwAAAAABgABAAACA4SFBQA7') repeat-x left top;"; break;
					case 2: cssText = "background: url('data:image/gif;base64,R0lGODlhAQAGAKEAAP///wAAADY2Nv///yH/C05FVFNDQVBFMi4wAwEAAAAh/hpDcmVhdGVkIHdpdGggYWpheGxvYWQuaW5mbwAh+QQACgD/ACwAAAAAAQAGAAACAxQuUgAh+QQBCgADACwAAAAAAQAGAAACA5SAUgAh+QQBCgADACwAAAAAAQAGAAACA5SBBQAh+QQBCgADACwAAAAAAQAGAAACA4QOUAAh+QQBCgADACwAAAAAAQAGAAACAwSEUAAh+QQBCgADACwAAAAAAQAGAAACA4SFBQA7') repeat-y right top;"; break;
					case 3: cssText = "background: url('data:image/gif;base64,R0lGODlhBgABAKEAAP///wAAADY2Nv///yH/C05FVFNDQVBFMi4wAwEAAAAh/hpDcmVhdGVkIHdpdGggYWpheGxvYWQuaW5mbwAh+QQACgD/ACwAAAAABgABAAACAxQuUgAh+QQBCgADACwAAAAABgABAAACA5SAUgAh+QQBCgADACwAAAAABgABAAACA5SBBQAh+QQBCgADACwAAAAABgABAAACA4QOUAAh+QQBCgADACwAAAAABgABAAACAwSEUAAh+QQBCgADACwAAAAABgABAAACA4SFBQA7') repeat-x left bottom;"; break;
				}
				
				borders[i].style.cssText = cssText + " opacity: 0.5; position: absolute; cursor: crosshair;";
				holder.appendChild(borders[i]);
				
				outer.push(document.createElement('div'));
				outer[i].style.cssText = "position: absolute; background: #000; opacity: 0.3; z-index: 2147483640; cursor: crosshair;";
				
				document.body.appendChild(outer[i]);
			}
			
			holder.appendChild(info);
			document.body.appendChild(holder);

			update();
			
			wrapper.addEventListener('mousedown', wrapperMouseDown, true);
			document.addEventListener('keydown', onKeyDown, false);
		}
	},
	
	wrapperMouseDown: function(e)
	{
		if (e.button == 0) 
		{
			FireShotSelection.wrapper.removeEventListener('mousedown', FireShotSelection.wrapperMouseDown, true);
			
			function wrapperMouseMove(e) 
			{
				var shift = FireShotSelection.autoScroll(e);

				FireShotSelection.x2 = shift.dx + e.pageX;
				FireShotSelection.y2 = shift.dy + e.pageY;
				FireShotSelection.update();
			}
			
			function wrapperMouseUp(e) {
				
				//FireShotSelection.x2 = e.pageX;
				//FireShotSelection.y2 = e.pageY;

				FireShotSelection.wrapper.removeEventListener('mousemove', wrapperMouseMove, false);
				document.removeEventListener('mouseup', wrapperMouseUp, false);
				FireShotSelection.update();
				FireShotSelection.completed();
			}
			
			FireShotSelection.x1 = e.pageX;
			FireShotSelection.y1 = e.pageY;
			
			FireShotSelection.prevx = e.pageX;
			FireShotSelection.prevy = e.pageY;
			
			FireShotSelection.wrapper.addEventListener('mousemove', wrapperMouseMove, false);
			document.addEventListener('mouseup', wrapperMouseUp, false);
			
		}	
		e.preventDefault();
		return true;		
	},
	
	onKeyDown: function(e) 
	{
		if (e.keyCode == 27) 
		{
			//FireShotSelection.onSelected = 0;
			FireShotSelection.x1 = 0;
			FireShotSelection.y1 = 0;
			FireShotSelection.x2 = 0;
			FireShotSelection.y2 = 0;
			
			FireShotSelection.completed();
		}
	},

	update: function()
	{
		with (this)
		{
			if (destroyed) return;
			
			var docWidth = doc.compatMode == "CSS1Compat" ? doc.documentElement.scrollWidth : body.scrollWidth;
			var docHeight = doc.compatMode == "CSS1Compat" ? doc.documentElement.scrollHeight : body.scrollHeight;
			
			var left = Math.min(x1, x2), top = Math.min(y1, y2), width = Math.abs(x2 - x1), height = Math.abs(y2 - y1);
			
			holder.style.left = left + "px";
			holder.style.top = top + "px";
			holder.style.width = width + "px";
			holder.style.height = height + "px";
			
			wrapper.style.width = docWidth + "px";
			wrapper.style.height = docHeight + "px";
			
			
			outer[0].style.left = 0 + "px" ;
			outer[0].style.top = 0 + "px";
			outer[0].style.width = docWidth + "px";
			outer[0].style.height = holder.style.top;

			outer[1].style.left = 0 + "px";
			outer[1].style.top = top + height + "px";
			outer[1].style.width = docWidth + "px";
			outer[1].style.height = docHeight - (top + height) + "px";
			
			outer[2].style.left = 0 + "px";
			outer[2].style.top = top + "px";
			outer[2].style.width = left + "px";
			outer[2].style.height = height + "px";
		
			outer[3].style.left = left + width + "px";
			outer[3].style.top = top + "px";
			outer[3].style.width = docWidth - (left + width) + "px";
			outer[3].style.height = height + "px";
			
			for (var i = 0; i < 4; i ++)
			{
				borders[i].style.left = 0 + "px";
				borders[i].style.top = 0 + "px";
				borders[i].style.right = 0 + "px";
				borders[i].style.bottom = 0 + "px";
			}
			
			info.innerHTML = width + " x " + height;
			info.style.visibility = info.scrollWidth + 11 < width && info.scrollHeight + 11 < height ? "visible" : "hidden";
		}
	},
	
	autoScroll: function(e) 
	{
		with (this)
		{
			var shift = {dx:body.scrollLeft, dy:body.scrollTop},
				speed = 2;
			
			
			if (e.clientX < 100 && prevx > e.clientX) body.scrollLeft -= (100 - e.clientX) / speed;
			if (e.clientY < 100 && prevy > e.clientY) body.scrollTop -=  (100 - e.clientY) / speed;

			var dX = window.innerWidth - e.clientX;
			if (dX < 100 && prevx < e.clientX) body.scrollLeft += (100 - dX) / speed; 

			var dY = window.innerHeight - e.clientY;
			if (dY < 100 && prevy < e.clientY) body.scrollTop += (100 - dY) / speed; 
			
			prevx = e.clientX;
			prevy = e.clientY;
			
			shift.dx = body.scrollLeft - shift.dx;
			shift.dy = body.scrollTop - shift.dy;
			
			return shift;
		}
	},
	
	completed: function()
	{
		with (this)
		{
			if (destroyed) return;
			
			destroyed = true;
			wrapper.removeEventListener('mousedown', wrapperMouseDown, true);
			document.removeEventListener('keydown', onKeyDown, false);
			
			document.body.style.cursor = cursor;
			document.body.removeChild(holder);
			document.body.removeChild(wrapper);
			
			for (var i = 0; i < 4; i ++)
				document.body.removeChild(outer[i]);
				
			if (onSelected)
				onSelected({left: Math.min(x1, x2), top: Math.min(y1, y2), right: Math.max(x1, x2), bottom: Math.max(y1, y2)});
		}
	}
}
